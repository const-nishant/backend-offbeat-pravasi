import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';

@Injectable()
export class BookingReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingReminderScheduler.name);
  private readonly queue = new Queue('booking-reminder-queue', {
    connection: bullConnection,
  });

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        'check-upcoming-bookings',
        {},
        {
          jobId: 'booking-reminder-checker',
          removeOnComplete: true,
          repeat: { every: 6 * 60 * 60 * 1000 },
        },
      );

      this.logger.log('Booking reminder scheduler registered (every 6h)');
    } catch (error) {
      this.logger.error('Failed to register booking reminder scheduler', error);
    }
  }

  async processUpcomingReminders(): Promise<{ reminded: number }> {
    const upcoming = await this.dataSource.query(
      `SELECT b.id, b."userId", t.name, t."startDate"
       FROM bookings b
       JOIN treks t ON t.id = b."trekId"
       WHERE b.status = 'CONFIRMED'
         AND t."startDate" BETWEEN now() AND now() + interval '48 hours'`,
    );

    for (const booking of upcoming) {
      await this.queue.add(
        'send-reminder',
        { bookingId: booking.id },
        { removeOnComplete: true },
      );
    }

    this.logger.log(`Enqueued ${upcoming.length} booking reminders`);
    return { reminded: upcoming.length };
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
