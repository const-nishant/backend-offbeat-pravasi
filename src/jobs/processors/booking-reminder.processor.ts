import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';

@Injectable()
export class BookingReminderWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BookingReminderWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('booking-reminder-queue', {
    connection: bullConnection,
  });

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'booking-reminder-queue',
      async (job) => {
        const { bookingId } = job.data as { bookingId: string };

        const bookings = await this.dataSource.query(
          `SELECT b.id, b."userId", b."trekId", b."startDate",
                  u.email, u."fullName",
                  t.name as "trekName", t.location
           FROM bookings b
           JOIN users u ON u.id = b."userId"
           JOIN treks t ON t.id = b."trekId"
           WHERE b.id = $1 AND b.status = 'CONFIRMED'`,
          [bookingId],
        );

        if (!bookings || bookings.length === 0) {
          this.logger.warn(`Booking ${bookingId} not found or not confirmed`);
          return { skipped: true, reason: 'not found or not confirmed' };
        }

        const booking = bookings[0];

        this.logger.log(
          `Sending reminder for booking ${bookingId} to ${booking.email}`,
        );

        return {
          reminded: true,
          bookingId,
          email: booking.email,
        };
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Booking reminder job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Booking reminder job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Booking reminder worker started');
  }

  async addReminderJob(
    bookingId: string,
    delayMs: number,
  ): Promise<{ enqueued: boolean; jobId?: string }> {
    const job = await this.queue.add(
      'send-reminder',
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
