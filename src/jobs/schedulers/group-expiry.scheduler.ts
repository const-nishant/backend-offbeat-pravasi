import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../config';

@Injectable()
export class GroupExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GroupExpiryScheduler.name);
  private readonly queue = new Queue('group-expiry-queue', {
    connection: bullConnection,
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        'expire-stale-groups',
        {},
        {
          jobId: 'group-expiry-checker',
          removeOnComplete: true,
          repeat: { every: 60 * 60 * 1000 },
        },
      );
      this.logger.log('Group expiry scheduler registered (every 1h)');
    } catch (error) {
      this.logger.error('Failed to register group expiry scheduler', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
