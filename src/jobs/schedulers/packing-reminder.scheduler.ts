import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { packingReminderQueue } from '../queues';
import { CRON_TZ } from '../config';

@Injectable()
export class PackingReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(PackingReminderScheduler.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await packingReminderQueue.add(
        'check-upcoming-treks',
        {},
        {
          jobId: 'packing-reminder-checker',
          removeOnComplete: true,
          repeat: { every: 6 * 60 * 60 * 1000, tz: CRON_TZ },
        },
      );

      this.logger.log('Packing reminder scheduler registered (every 6h)');
    } catch (error) {
      this.logger.error('Failed to register packing reminder scheduler', error);
    }
  }

  async processUpcomingReminders(): Promise<{ reminded: number }> {
    const upcoming = await this.dataSource.query(
      `SELECT b.id, b."user_id" as "userId"
       FROM bookings b
       JOIN treks t ON t.id = b."trek_id"
       WHERE b.status = 'CONFIRMED'
         AND t."start_date" BETWEEN now() AND now() + interval '72 hours'`,
    );

    for (const booking of upcoming) {
      await packingReminderQueue.add(
        'send-packing-reminder',
        { bookingId: booking.id },
        { removeOnComplete: true },
      );
    }

    this.logger.log(`Enqueued ${upcoming.length} packing reminders`);
    return { reminded: upcoming.length };
  }
}
