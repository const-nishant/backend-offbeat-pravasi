import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Payment, PaymentStatus } from '../bookings/entities/payment.entity';
import { AuditLogService } from './audit-log.service';
import { AdminBookingOverrideDto } from './dtos/admin-booking-override.dto';
import {
  AdminForceCancelDto,
  ForceCancelRefund,
} from './dtos/admin-force-cancel.dto';

interface TimelineEntry {
  id: string;
  type:
    | 'booking_created'
    | 'booking_updated'
    | 'payment_event'
    | 'admin_override'
    | 'admin_force_cancel';
  label: string;
  detail: string;
  createdAt: string;
  actorId?: string | null;
  actorEmail?: string | null;
}

@Injectable()
export class AdminBookingOverrideService {
  private readonly logger = new Logger(AdminBookingOverrideService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async overrideBooking(
    id: string,
    dto: AdminBookingOverrideDto,
    actor: any,
    req?: any,
  ) {
    if (dto.reason.length < 10) {
      throw new BadRequestException(
        'Override reason must be at least 10 characters',
      );
    }

    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const changes: Record<string, unknown> = {};

    return this.dataSource.transaction(async (em) => {
      const bookingRepo = em.getRepository(Booking);

      const locked = await bookingRepo
        .createQueryBuilder('b')
        .where('b.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!locked) throw new NotFoundException('Booking not found');

      if (dto.priceDelta !== undefined) {
        const newTotal = locked.totalAmountInr + dto.priceDelta;
        if (newTotal < 0) {
          throw new BadRequestException(
            'Price delta would result in a negative total',
          );
        }
        locked.totalAmountInr = newTotal;
        locked.unitPriceInr = Math.round(newTotal / locked.quantity);
        changes.priceDelta = dto.priceDelta;
        changes.newTotal = newTotal;
      }

      if (dto.newStartDate) {
        const snapshot = { ...(locked.trekSnapshot ?? {}) } as Record<
          string,
          unknown
        >;
        snapshot.startDate = dto.newStartDate;
        locked.trekSnapshot = snapshot as any;
        changes.newStartDate = dto.newStartDate;
      }

      const existingMeta = (locked.metadata ?? {}) as Record<string, unknown>;
      locked.metadata = {
        ...existingMeta,
        lastOverriddenAt: new Date().toISOString(),
        overrideReason: dto.reason,
        overrideNotes: dto.notes ?? null,
        overrideCount: ((existingMeta.overrideCount as number) ?? 0) + 1,
      } as any;

      await bookingRepo.save(locked);

      await this.auditLogService.save({
        actorId: actor.id,
        actorEmail: actor.email
          ? `${String(actor.email).slice(0, 3)}***`
          : null,
        actorRole: 'ADMIN',
        action: 'BOOKING_OVERRIDE',
        resourceType: 'booking',
        resourceId: id,
        detail: {
          changes,
          reason: dto.reason,
          notes: dto.notes ?? null,
          previousStatus: locked.status,
          previousTotal: locked.totalAmountInr - (dto.priceDelta ?? 0),
        },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
        userAgent: req?.headers?.['user-agent'] || undefined,
      });

      const updated = await bookingRepo.findOne({ where: { id } });
      return { booking: updated, changes };
    });
  }

  async forceCancel(
    id: string,
    dto: AdminForceCancelDto,
    actor: any,
    req?: any,
  ) {
    if (dto.reason.length < 10) {
      throw new BadRequestException(
        'Cancel reason must be at least 10 characters',
      );
    }

    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.dataSource.transaction(async (em) => {
      const bookingRepo = em.getRepository(Booking);
      const paymentRepo = em.getRepository(Payment);

      const locked = await bookingRepo
        .createQueryBuilder('b')
        .where('b.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!locked) throw new NotFoundException('Booking not found');

      if (locked.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      const payment = await paymentRepo.findOne({
        where: { bookingId: id, status: PaymentStatus.SUCCEEDED },
      });

      let refundAmount = 0;
      const existingMeta = (locked.metadata ?? {}) as Record<string, unknown>;

      if (dto.refundOverride === ForceCancelRefund.FULL && payment) {
        payment.status = PaymentStatus.REFUNDED;
        payment.metadata = {
          ...(payment.metadata ?? {}),
          forceCancelRefund: true,
          forceCancelReason: dto.reason,
          refundNote: dto.refundNote ?? null,
          refundedAt: new Date().toISOString(),
          cancelledByAdmin: actor.id,
        } as any;
        await paymentRepo.save(payment);
        refundAmount = payment.amountInr;
      } else if (dto.refundOverride === ForceCancelRefund.PARTIAL && payment) {
        payment.metadata = {
          ...(payment.metadata ?? {}),
          forceCancelPartialRefund: true,
          forceCancelReason: dto.reason,
          refundNote: dto.refundNote ?? null,
          partiallyRefundedAt: new Date().toISOString(),
          cancelledByAdmin: actor.id,
        } as any;
        await paymentRepo.save(payment);
      }

      locked.status = BookingStatus.CANCELLED;
      locked.metadata = {
        ...existingMeta,
        cancelledAt: new Date().toISOString(),
        cancelledBy: actor.id,
        cancelReason: dto.reason,
        forceCancelRefund: dto.refundOverride,
        refundNote: dto.refundNote ?? null,
      } as any;
      await bookingRepo.save(locked);

      await this.auditLogService.save({
        actorId: actor.id,
        actorEmail: actor.email
          ? `${String(actor.email).slice(0, 3)}***`
          : null,
        actorRole: 'ADMIN',
        action: 'BOOKING_FORCE_CANCEL',
        resourceType: 'booking',
        resourceId: id,
        detail: {
          reason: dto.reason,
          refundOverride: dto.refundOverride,
          refundNote: dto.refundNote ?? null,
          hadPayment: !!payment,
          refundAmount,
        },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
        userAgent: req?.headers?.['user-agent'] || undefined,
      });

      return {
        booking: locked,
        payment: payment
          ? {
              id: payment.id,
              status: payment.status,
              amountInr: payment.amountInr,
              refundAmount,
            }
          : null,
        refundApplied: refundAmount > 0,
      };
    });
  }

  async getTimeline(id: string) {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const entries: TimelineEntry[] = [];

    entries.push({
      id: `booking-created-${booking.id}`,
      type: 'booking_created',
      label: 'Booking created',
      detail: `Booking ${booking.id} created with status ${booking.status}`,
      createdAt: booking.createdAt.toISOString(),
    });

    const payments = await this.paymentRepo.find({
      where: { bookingId: id },
      order: { createdAt: 'DESC' },
    });

    for (const p of payments) {
      let label = `Payment ${p.status}`;
      if (p.status === PaymentStatus.SUCCEEDED) label = 'Payment succeeded';
      else if (p.status === PaymentStatus.REFUNDED) label = 'Payment refunded';
      else if (p.status === PaymentStatus.FAILED) label = 'Payment failed';
      else if (p.status === PaymentStatus.CREATED) label = 'Payment created';

      entries.push({
        id: `payment-${p.id}`,
        type: 'payment_event',
        label,
        detail: `Provider: ${p.provider}, Amount: INR ${p.amountInr}${p.refundAudit?.length ? `, Refunds: ${p.refundAudit.length}` : ''}`,
        createdAt: p.createdAt.toISOString(),
      });

      if (p.refundAudit?.length) {
        for (const r of p.refundAudit) {
          entries.push({
            id: `refund-${r.refundId}`,
            type: 'admin_override',
            label: 'Refund processed',
            detail: `Amount: INR ${r.amount}, Reason: ${r.reason}`,
            createdAt: r.refundedAt,
            actorId: r.refundedBy,
          });
        }
      }
    }

    const auditLogs = await this.auditLogService.query(
      { resourceType: 'booking', resourceId: id },
      { page: 1, limit: 100 },
    );

    for (const al of auditLogs.data) {
      if (
        al.action === 'BOOKING_OVERRIDE' ||
        al.action === 'BOOKING_FORCE_CANCEL'
      ) {
        entries.push({
          id: `audit-${al.id}`,
          type:
            al.action === 'BOOKING_OVERRIDE'
              ? 'admin_override'
              : 'admin_force_cancel',
          label:
            al.action === 'BOOKING_OVERRIDE'
              ? 'Admin override'
              : 'Admin force cancel',
          detail: JSON.stringify(al.detail ?? {}),
          createdAt: al.createdAt.toISOString?.() ?? String(al.createdAt),
          actorId: al.actorId,
          actorEmail: al.actorEmail,
        });
      }
    }

    entries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { data: entries, total: entries.length, bookingId: id };
  }
}
