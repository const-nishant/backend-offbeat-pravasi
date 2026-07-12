import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { priceDropQueue } from '../queues';

@Injectable()
export class PriceDropScheduler implements OnModuleInit {
  private readonly logger = new Logger(PriceDropScheduler.name);

  async onModuleInit(): Promise<void> {
    try {
      await priceDropQueue.add(
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
}
