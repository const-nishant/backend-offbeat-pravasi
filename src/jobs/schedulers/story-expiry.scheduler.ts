import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../config';

@Injectable()
export class StoryExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoryExpiryScheduler.name);
  private readonly queue = new Queue('story-expiry-queue', {
    connection: bullConnection,
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        'expire-stories',
        {},
        {
          jobId: 'story-expiry-repeater',
          removeOnComplete: true,
          repeat: { every: 60 * 60 * 1000 },
        },
      );

      this.logger.log('Story expiry scheduler registered (every 60 minutes)');
    } catch (error) {
      this.logger.error('Failed to register story expiry scheduler', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
