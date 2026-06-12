import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';

@Injectable()
export class BookingReleaseWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BookingReleaseWorkerService.name);
  private worker!: Worker;

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'booking-release-queue',
      async () => {
        const res = await this.dataSource.query(`
          UPDATE bookings
          SET status = 'FAILED',
              metadata = jsonb_set(COALESCE(metadata, '{}'), '{releasedAt}', to_jsonb(now() at time zone 'utc')),
              updated_at = now()
          WHERE status = 'PENDING' AND hold_expires_at <= now()
          RETURNING id;
        `);

        return { released: res.length };
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Booking release job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Booking release job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Booking release worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
