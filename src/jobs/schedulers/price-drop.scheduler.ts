import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../config';

@Injectable()
export class PriceDropScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceDropScheduler.name);
  private readonly queue = new Queue('price-drop-queue', {
    connection: bullConnection,
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        'check-price-drops',
        {},
        {
          jobId: 'price-drop-checker',
          removeOnComplete: true,
          repeat: { every: 24 * 60 * 60 * 1000 },
        },
      );
      this.logger.log('Price-drop scheduler registered (every 24h)');
    } catch (error) {
      this.logger.error('Failed to register price-drop scheduler', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
