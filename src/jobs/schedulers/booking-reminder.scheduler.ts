import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bookingReminderQueue } from '../queues';
import { CRON_TZ } from '../config';

@Injectable()
export class BookingReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(BookingReminderScheduler.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await bookingReminderQueue.add(
        'check-upcoming-bookings',
        {},
        {
          jobId: 'booking-reminder-checker',
          removeOnComplete: true,
          repeat: { every: 6 * 60 * 60 * 1000, tz: CRON_TZ },
        },
      );

      this.logger.log('Booking reminder scheduler registered (every 6h)');
    } catch (error) {
      this.logger.error('Failed to register booking reminder scheduler', error);
    }
  }

  async processUpcomingReminders(): Promise<{ reminded: number }> {
    const upcoming = await this.dataSource.query(
      `SELECT b.id, b."user_id" as "userId", t.name, t."start_date" as "startDate"
       FROM bookings b
       JOIN treks t ON t.id = b."trek_id"
       WHERE b.status = 'CONFIRMED'
         AND t."start_date" BETWEEN now() AND now() + interval '48 hours'`,
    );

    for (const booking of upcoming) {
      await bookingReminderQueue.add(
        'send-reminder',
        { bookingId: booking.id },
        { removeOnComplete: true },
      );
    }

    this.logger.log(`Enqueued ${upcoming.length} booking reminders`);
    return { reminded: upcoming.length };
  }
}
