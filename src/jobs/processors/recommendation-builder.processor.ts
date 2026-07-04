import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { RecommendationsService } from '../../modules/recommendations/recommendations.service';
import { bullConnection } from '../config';

@Injectable()
export class RecommendationBuilderWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RecommendationBuilderWorkerService.name);
  private worker!: Worker;

  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'recommendation-builder-queue',
      async () => {
        this.logger.log('Starting recommendation build for all users');
        await this.recommendationsService.buildAll();
        this.logger.log('Recommendation build completed');
      },
      { connection: bullConnection, concurrency: 1 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Recommendation build job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Recommendation build job ${job?.id} failed: ${err.message}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
