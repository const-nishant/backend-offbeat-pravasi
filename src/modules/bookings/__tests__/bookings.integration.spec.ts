import { DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { BookingsService } from '../bookings.service';
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';

describe('BookingsService integration (sqlite)', () => {
  let dataSource: DataSource;
  let service: BookingsService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [Booking, Trek],
    });
    await dataSource.initialize();

    const trekRepo = dataSource.getRepository(Trek);
    const bookingRepo = dataSource.getRepository(Booking);

    // create a sample trek
    const trek = trekRepo.create({
      name: 'Test Trek',
      maxParticipants: 2,
      costInr: 1000,
      isPublished: true,
      startDate: new Date().toISOString(),
    } as any);
    await trekRepo.save(trek);

    // simple settings service stub
    const settingsService = {
      getSettings: async () => ({ holdWindowMinutes: 15 }),
    } as any;

    service = new BookingsService(
      bookingRepo,
      trekRepo,
      settingsService,
      dataSource as any,
    );
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  test('createBooking should prevent overbooking', async () => {
    const user = { id: 'user-1' } as any;

    // first booking reserves all seats
    const b1 = await service.createBooking(
      { trekId: '1', quantity: 2 } as any,
      user,
    );
    expect(b1).toBeDefined();
    expect(b1.quantity).toBe(2);

    // second booking should fail due to lack of seats
    await expect(
      service.createBooking({ trekId: '1', quantity: 1 } as any, user),
    ).rejects.toThrow();
  });

  test('releaseExpiredHolds should mark expired pending bookings as FAILED', async () => {
    const bookingRepo = dataSource.getRepository(Booking);
    // create a pending booking with expired hold
    const expired = bookingRepo.create({
      trekId: '1',
      userId: 'u2',
      quantity: 1,
      unitPriceInr: 1000,
      totalAmountInr: 1000,
      status: BookingStatus.PENDING,
      holdExpiresAt: new Date(Date.now() - 1000 * 60).toISOString(),
    } as any);
    await bookingRepo.save(expired);

    const res = await service.releaseExpiredHolds();
    expect(res.released).toBeGreaterThanOrEqual(1);

    const reloaded = await bookingRepo.findOne({
      where: { id: expired.id } as any,
    });
    expect(reloaded.status).toBe(BookingStatus.FAILED);
  });
});
