import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Trek } from '../treks/entities/trek.entity';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { PlatformSettingsService } from '../admin/platform-settings.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    private readonly settingsService: PlatformSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  async createBooking(dto: CreateBookingDto, user: any) {
    const settings = await this.settingsService.getSettings();
    const holdMinutes = settings?.holdWindowMinutes ?? 15;

    // Use a transaction with pessimistic lock on the trek row to avoid race conditions
    return await this.dataSource.transaction(async (em) => {
      // lock the trek row
      const lockedTrek = await em
        .getRepository(Trek)
        .createQueryBuilder('t')
        .where('t.id = :id', { id: dto.trekId })
        .setLock('pessimistic_write')
        .getOne();

      if (!lockedTrek) throw new NotFoundException('Trek not found');
      if (!lockedTrek.isPublished)
        throw new BadRequestException('Trek is not published');

      // compute reserved seats (CONFIRMED + active PENDING) inside the transaction
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

      // snapshot trek
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
        metadata: { clientReference: dto.clientReference ?? null },
      } as Partial<Booking>);

      return em.save(booking);
    });
  }

  async releaseExpiredHolds() {
    // find pending bookings where hold has expired
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
