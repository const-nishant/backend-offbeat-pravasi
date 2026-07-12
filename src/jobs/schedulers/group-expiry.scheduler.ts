import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { groupExpiryQueue } from '../queues';

@Injectable()
export class GroupExpiryScheduler implements OnModuleInit {
  private readonly logger = new Logger(GroupExpiryScheduler.name);

  async onModuleInit(): Promise<void> {
    try {
      await groupExpiryQueue.add(
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
}
