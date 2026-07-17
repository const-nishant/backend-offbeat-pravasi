import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { priceDropQueue } from '../queues';
import { CRON_TZ } from '../config';

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
          repeat: { pattern: '0 0 * * *', tz: CRON_TZ },
        },
      );
      this.logger.log('Price-drop scheduler registered (daily 00:00 IST)');
    } catch (error) {
      this.logger.error('Failed to register price-drop scheduler', error);
    }
  }
}
