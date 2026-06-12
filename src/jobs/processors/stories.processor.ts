import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';

@Injectable()
export class StoryExpiryWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StoryExpiryWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('story-expiry-queue', {
    connection: bullConnection,
  });

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'story-expiry-queue',
      async () => {
        const result = await this.dataSource.query(
          `DELETE FROM stories WHERE "expiresAt" < NOW() RETURNING id`,
        );

        const deletedCount = result?.length ?? 0;

        if (deletedCount > 0) {
          this.logger.log(`Deleted ${deletedCount} expired stories`);
        }

        return { deletedCount };
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Story expiry job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Story expiry job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Story expiry worker started');
  }

  async enqueueExpiryJob(): Promise<void> {
    await this.queue.add('expire-stories', {}, { removeOnComplete: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
