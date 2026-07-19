import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '../../modules/notifications/enums/notification-type.enum';

@Injectable()
export class PackingReminderWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PackingReminderWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('packing-reminder-queue', {
    connection: bullConnection,
  });

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'packing-reminder-queue',
      async (job) => {
        const { bookingId } = job.data as { bookingId: string };

        const rows = await this.dataSource.query(
          `SELECT b.id, b."user_id" as "userId", b."trek_id" as "trekId",
                  u."device_token" as "deviceToken",
                  t.name as "trekName", t."start_date" as "startDate"
           FROM bookings b
           JOIN users u ON u.id = b."user_id"
           JOIN treks t ON t.id = b."trek_id"
           WHERE b.id = $1 AND b.status = 'CONFIRMED'`,
          [bookingId],
        );

        if (!rows || rows.length === 0) {
          this.logger.warn(`Booking ${bookingId} not found or not confirmed`);
          return { skipped: true, reason: 'not found or not confirmed' };
        }

        const booking = rows[0];

        const uncheckedItems = await this.dataSource.query(
          `SELECT COUNT(*)::int as count
           FROM user_packing_list_items pli
           JOIN trek_gear_items tgi ON tgi.id = pli."trek_gear_item_id"
           WHERE pli."user_id" = $1
             AND tgi."trek_id" = $2
             AND pli.checked = false`,
          [booking.userId, booking.trekId],
        );

        if (uncheckedItems[0]?.count > 0) {
          const message = `You have ${uncheckedItems[0].count} unchecked packing items for ${booking.trekName} starting soon!`;
          try {
            await this.notificationsService.sendPushToUser(
              booking.userId,
              'Packing Reminder',
              message,
              NotificationType.BOOKING_REMINDER,
              { bookingId, trekId: booking.trekId },
            );
            this.logger.log(`Packing reminder sent for booking ${bookingId}`);
          } catch (e) {
            this.logger.error(
              `Failed to send packing reminder for booking ${bookingId}`,
              e as any,
            );
          }
        }

        return {
          reminded: true,
          bookingId,
        };
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Packing reminder job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Packing reminder job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Packing reminder worker started');
  }

  async addReminderJob(
    bookingId: string,
    delayMs: number,
  ): Promise<{ enqueued: boolean; jobId?: string }> {
    const job = await this.queue.add(
      'send-packing-reminder',
      { bookingId },
      { delay: delayMs },
    );
    return { enqueued: true, jobId: job.id };
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
