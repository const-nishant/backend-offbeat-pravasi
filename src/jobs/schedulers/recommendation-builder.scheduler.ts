import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { recommendationQueue } from '../queues';

@Injectable()
export class RecommendationBuilderScheduler implements OnModuleInit {
  private readonly logger = new Logger(RecommendationBuilderScheduler.name);

  async onModuleInit(): Promise<void> {
    try {
      await recommendationQueue.add(
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
}
