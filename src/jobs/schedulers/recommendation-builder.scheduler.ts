import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../config';

@Injectable()
export class RecommendationBuilderScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecommendationBuilderScheduler.name);
  private readonly queue = new Queue('recommendation-builder-queue', {
    connection: bullConnection,
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.queue.add(
        'build-candidates',
        {},
        {
          jobId: 'recommendation-build',
          removeOnComplete: true,
          repeat: { pattern: '0 */6 * * *' },
        },
      );
      this.logger.log('Recommendation builder scheduled every 6 hours');
    } catch (err) {
      this.logger.warn(
        'Failed to schedule recommendation builder:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
