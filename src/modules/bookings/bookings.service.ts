import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Trek } from '../treks/entities/trek.entity';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { PlatformSettingsService } from '../admin/platform-settings.service';
import {
  getPagination,
  buildPaginationMeta,
} from 'src/common/pagination/pagination.util';
import { TicketService } from './ticket.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';
import type { BookingCancelDetails } from '../mailer/interfaces/mailer.interface';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly settingsService: PlatformSettingsService,
    private readonly ticketService: TicketService,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly mailerService: MailerService,
  ) {}

  async createBooking(dto: CreateBookingDto, user: any) {
    const settings = await this.settingsService.getSettings();
    const holdMinutes = settings?.holdWindowMinutes ?? 15;

    return await this.dataSource.transaction(async (em) => {
      const lockedTrek = await em
        .getRepository(Trek)
        .createQueryBuilder('t')
        .where('t.id = :id', { id: dto.trekId })
        .setLock('pessimistic_write')
        .getOne();

      if (!lockedTrek) throw new NotFoundException('Trek not found');
      if (!lockedTrek.isPublished)
        throw new BadRequestException('Trek is not published');

      const now = new Date();
      const qb = em
        .getRepository(Booking)
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.quantity),0)', 'reserved')
        .where('b.trekId = :trekId', { trekId: dto.trekId })
        .andWhere(
          "(b.status = 'CONFIRMED' OR (b.status = 'PENDING' AND b.holdExpiresAt > :now))",
          { now },
        );
      const res = await qb.getRawOne();
      const reserved = Number(res?.reserved ?? 0);

      if (reserved + dto.quantity > lockedTrek.maxParticipants) {
        throw new BadRequestException('Not enough seats available');
      }

      const snapshot = {
        id: lockedTrek.id,
        name: lockedTrek.name,
        organizerId: lockedTrek.organizer?.id ?? null,
        maxParticipants: lockedTrek.maxParticipants,
        startDate: lockedTrek.startDate,
        unitPriceInr: lockedTrek.costInr,
      };

      const booking = em.create(Booking, {
        trekId: dto.trekId,
        trekSnapshot: snapshot,
        userId: user.id,
        participants: dto.participants ?? null,
        quantity: dto.quantity,
        unitPriceInr: lockedTrek.costInr,
        totalAmountInr: lockedTrek.costInr * dto.quantity,
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date(Date.now() + holdMinutes * 60 * 1000),
        metadata: {
          contactEmail: dto.contactEmail ?? null,
          contactPhone: dto.contactPhone ?? null,
          clientReference: dto.clientReference ?? null,
        },
      } as Partial<Booking>);

      return em.save(booking);
    });
  }

  async findByUser(userId: string, query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = getPagination(query);
    const [data, total] = await this.bookingRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, pagination: buildPaginationMeta(page, limit, total) };
  }

  async findOne(id: string, userId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) {
      const trek = await this.trekRepo.findOne({
        where: { id: booking.trekId },
        relations: ['organizer'],
      });
      const isOrganizer = trek?.organizer?.id === userId;
      if (!isOrganizer) throw new ForbiddenException('Access denied');
    }
    return booking;
  }

  async cancelBooking(id: string, userId: string, reason?: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId)
      throw new ForbiddenException('Access denied');
    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.PENDING
    ) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    const payment = await this.paymentRepo.findOne({
      where: { bookingId: id, status: PaymentStatus.SUCCEEDED },
    });

    booking.status = BookingStatus.CANCELLED;
    booking.metadata = {
      ...(booking.metadata ?? {}),
      cancelledAt: new Date().toISOString(),
      cancelReason: reason ?? null,
      refunded: !!payment,
    } as any;
    await this.bookingRepo.save(booking);

    if (payment) {
      payment.status = PaymentStatus.REFUNDED;
      payment.metadata = {
        ...(payment.metadata ?? {}),
        refundReason: reason ?? null,
        refundedAt: new Date().toISOString(),
      } as any;
      await this.paymentRepo.save(payment);
    }

    const trekSnapshotName = booking.trekSnapshot?.name ?? 'Trek';
    this.notificationsService
      .notifyBookingCancelled(userId, id, trekSnapshotName)
      .catch((e) => this.logger.error('Cancellation push failed', e));

    try {
      const userEmail = booking.metadata?.contactEmail;
      if (userEmail) {
        const details: BookingCancelDetails = {
          name: 'Traveller',
          trekName: trekSnapshotName,
          bookingId: booking.id,
          refundInfo: payment ? 'A refund will be processed shortly.' : undefined,
        };
        await this.mailerService.sendBookingCancellationEmail(
          userEmail,
          details,
        );
      }
    } catch (e) {
      this.logger.error('Failed to send cancellation email', e as any);
    }

    return { booking, refunded: !!payment };
  }

  async getTicketPdf(id: string, userId: string): Promise<{ buffer: Buffer }> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwner = booking.userId === userId;
    const trek = !isOwner
      ? await this.trekRepo.findOne({
          where: { id: booking.trekId },
          relations: ['organizer'],
        })
      : null;
    const isOrganizer = trek?.organizer?.id === userId;
    if (!isOwner && !isOrganizer) throw new ForbiddenException('Access denied');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Ticket only available for confirmed bookings',
      );
    }

    const pdfBuffer = await this.generatePdf(booking);
    return { buffer: pdfBuffer };
  }

  private async generatePdf(booking: Booking): Promise<Buffer> {
    const QRCode = await import('qrcode');
    const PDFDocument = (await import('pdfkit')).default;

    const token = await this.ticketService.generateSignedTicket({
      bookingId: booking.id,
      userId: booking.userId,
    });

    const qrData = JSON.stringify({
      bookingId: booking.id,
      token: token.token,
    });
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 200,
      margin: 1,
    });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const trek = booking.trekSnapshot || {};

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Offbeat Pravasi', { align: 'center' });
    doc
      .fontSize(16)
      .font('Helvetica')
      .text('Trek Booking Ticket', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').text('Booking Details');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Booking ID: ${booking.id}`);
    doc.text(`Status: ${booking.status}`);
    doc.text(`Booked on: ${booking.createdAt.toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('Trek Information');
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Trek: ${trek.name ?? 'N/A'}`);
    doc.text(
      `Start Date: ${trek.startDate ? new Date(trek.startDate).toISOString().slice(0, 10) : 'N/A'}`,
    );
    doc.text(`Quantity: ${booking.quantity}`);
    doc.moveDown();

    doc.fontSize(11).font('Helvetica-Bold').text('Payment Information');
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Total Paid: INR ${booking.totalAmountInr}`);
    doc.text(`Unit Price: INR ${booking.unitPriceInr}`);
    doc.moveDown(2);

    doc.image(qrCodeBuffer, {
      fit: [150, 150],
      align: 'center',
      valign: 'center',
    });
    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Scan to verify booking', { align: 'center' });
    doc.moveDown(2);

    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .text(
        'Terms & Conditions: Cancellation policy applies. Please contact support for any queries.',
        { align: 'center' },
      );

    doc.end();

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });
  }

  async verifyQrToken(qrToken: string) {
    try {
      const payload = await this.ticketService.verifyToken(qrToken);
      const booking = await this.bookingRepo.findOne({
        where: { id: payload.bookingId },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      return {
        valid: true,
        booking: {
          id: booking.id,
          status: booking.status,
          trekId: booking.trekId,
          trekName: booking.trekSnapshot?.name ?? null,
          quantity: booking.quantity,
          userId: booking.userId,
        },
      };
    } catch {
      return { valid: false, booking: null };
    }
  }

  async releaseExpiredHolds() {
    const now = new Date();
    const expired = await this.bookingRepo
      .createQueryBuilder()
      .where('status = :s', { s: BookingStatus.PENDING })
      .andWhere('holdExpiresAt <= :now', { now })
      .getMany();

    if (!expired.length) return { released: 0 };

    for (const b of expired) {
      try {
        b.status = BookingStatus.FAILED;
        b.metadata = {
          ...(b.metadata ?? {}),
          releasedAt: new Date().toISOString(),
        };
        await this.bookingRepo.save(b);
      } catch (e) {
        this.logger.error('Failed to release booking hold', e as any);
      }
    }

    return { released: expired.length };
  }
}
