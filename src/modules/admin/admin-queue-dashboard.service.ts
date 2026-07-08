import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../../jobs/config';

const QUEUE_NAMES = [
  'notification-queue',
  'notification-broadcast-queue',
  'story-expiry-queue',
  'booking-reminder-queue',
  'packing-reminder-queue',
  'booking-release-queue',
  'cleanup-queue',
  'ticket-pdf-queue',
  'weather-prefetch-queue',
  'checkin-first-warning-queue',
  'checkin-emergency-queue',
  'group-expiry-queue',
  'referral-reward-delivery-queue',
  'recommendation-builder-queue',
  'price-drop-queue',
] as const;

type QueueName = (typeof QUEUE_NAMES)[number];

@Injectable()
export class AdminQueueDashboardService {
  private readonly logger = new Logger(AdminQueueDashboardService.name);

  async listQueues(): Promise<
    {
      name: string;
      counts: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: boolean;
      };
    }[]
  > {
    const results = await Promise.allSettled(
      QUEUE_NAMES.map(async (name) => {
        const queue = new Queue(name, { connection: bullConnection });
        try {
          const [counts, isPaused] = await Promise.all([
            queue.getJobCounts(),
            queue.isPaused(),
          ]);
          return {
            name,
            counts: {
              waiting: counts.waiting ?? 0,
              active: counts.active ?? 0,
              completed: counts.completed ?? 0,
              failed: counts.failed ?? 0,
              delayed: counts.delayed ?? 0,
              paused: isPaused,
            },
          };
        } finally {
          await queue.close();
        }
      }),
    );

    return results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            name: 'unknown',
            counts: {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              paused: false,
            },
          },
    );
  }

  async getJobs(
    queueName: string,
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    start = 0,
    end = 20,
  ) {
    const queue = this.getQueue(queueName);
    try {
      const jobs = await queue.getJobs([status], start, end);
      return jobs.map((j) => ({
        id: j.id,
        name: j.name,
        data: j.data,
        timestamp: j.timestamp,
        processedOn: j.processedOn,
        finishedOn: j.finishedOn,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        stacktrace: j.stacktrace?.slice(0, 1),
      }));
    } finally {
      await queue.close();
    }
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName);
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        throw new NotFoundException(
          `Job ${jobId} not found in queue ${queueName}`,
        );
      }
      await job.retry();
      this.logger.log(`Retried job ${jobId} in queue ${queueName}`);
      return { success: true, jobId };
    } finally {
      await queue.close();
    }
  }

  async retryAll(queueName: string) {
    const queue = this.getQueue(queueName);
    try {
      const failed = await queue.getJobs(['failed']);
      await Promise.all(failed.map((j) => j.retry()));
      this.logger.log(
        `Retried ${failed.length} failed jobs in queue ${queueName}`,
      );
      return { success: true, count: failed.length };
    } finally {
      await queue.close();
    }
  }

  async clean(queueName: string, hours = 24) {
    const queue = this.getQueue(queueName);
    try {
      const age = hours * 3600 * 1000;
      const cleaned = await queue.clean(age, 1000, 'completed');
      this.logger.log(
        `Cleaned ${cleaned.length} completed jobs older than ${hours}h in queue ${queueName}`,
      );
      return { success: true, removedCount: cleaned.length };
    } finally {
      await queue.close();
    }
  }

  async pause(queueName: string) {
    const queue = this.getQueue(queueName);
    try {
      await queue.pause();
      this.logger.log(`Paused queue ${queueName}`);
      return { success: true };
    } finally {
      await queue.close();
    }
  }

  async resume(queueName: string) {
    const queue = this.getQueue(queueName);
    try {
      await queue.resume();
      this.logger.log(`Resumed queue ${queueName}`);
      return { success: true };
    } finally {
      await queue.close();
    }
  }

  private getQueue(name: string): Queue {
    if (!QUEUE_NAMES.includes(name as QueueName)) {
      throw new NotFoundException(`Unknown queue: ${name}`);
    }
    return new Queue(name, { connection: bullConnection });
  }
}
