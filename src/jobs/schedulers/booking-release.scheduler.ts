import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../config';

@Injectable()
export class BookingReleaseScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingReleaseScheduler.name);
  private readonly queue = new Queue('booking-release-queue', {
    connection: bullConnection,
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        'release-expired',
        {},
        {
          jobId: 'booking-release-repeater',
          removeOnComplete: true,
          repeat: { every: 60 * 1000 },
        },
      );

      this.logger.log('Booking release scheduler registered (every 60s)');
    } catch (error) {
      this.logger.error('Failed to register booking release scheduler', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
