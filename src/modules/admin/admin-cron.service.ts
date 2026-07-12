import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { bullConnection } from '../../jobs/config';

const CRON_QUEUE_NAMES = [
  'booking-release-queue',
  'booking-reminder-queue',
  'packing-reminder-queue',
  'weather-prefetch-queue',
  'group-expiry-queue',
  'price-drop-queue',
  'recommendation-builder-queue',
] as const;

type CronQueueName = (typeof CRON_QUEUE_NAMES)[number];

@Injectable()
export class AdminCronService {
  private readonly logger = new Logger(AdminCronService.name);

  async listCronJobs() {
    const results = await Promise.allSettled(
      CRON_QUEUE_NAMES.map(async (queueName) => {
        const queue = new Queue(queueName, { connection: bullConnection });
        try {
          const repeatableJobs = await queue.getRepeatableJobs();
          return repeatableJobs.map((j) => ({
            queue: queueName,
            jobName: j.name,
            jobId: j.id,
            pattern: j.pattern ?? null,
            every: j.every ?? null,
            nextRun: j.next ? new Date(j.next).toISOString() : null,
            tz: j.tz ?? null,
            key: j.key,
          }));
        } finally {
          await queue.close();
        }
      }),
    );

    const jobs: any[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        jobs.push(...result.value);
      }
    }
    return jobs;
  }

  async disableCronJob(key: string) {
    const { queueName, jobId } = this.parseKey(key);
    const queue = new Queue(queueName, { connection: bullConnection });
    try {
      const repeatableJobs = await queue.getRepeatableJobs();
      const job = repeatableJobs.find((j) => j.key === key);
      if (!job) {
        throw new NotFoundException(`Cron job not found: ${key}`);
      }
      await queue.removeRepeatableByKey(key);
      this.logger.log(`Disabled cron job ${jobId} in queue ${queueName}`);
      return { success: true, queue: queueName, jobId };
    } finally {
      await queue.close();
    }
  }

  async enableCronJob(key: string) {
    const { queueName } = this.parseKey(key);
    const queue = new Queue(queueName, { connection: bullConnection });
    try {
      const repeatableJobs = await queue.getRepeatableJobs();
      const job = repeatableJobs.find((j) => j.key === key);
      if (job) {
        return { success: true, message: 'Cron job already enabled' };
      }

      const jobDef = this.getJobDefinition(key);
      if (!jobDef) {
        throw new NotFoundException(`Job definition not found for: ${key}`);
      }

      const repeatOptions: Record<string, unknown> = {
        jobId: jobDef.jobId,
        removeOnComplete: true,
      };
      if (jobDef.pattern) {
        repeatOptions.repeat = { pattern: jobDef.pattern };
      } else if (jobDef.every) {
        repeatOptions.repeat = { every: jobDef.every };
      }

      await queue.add(jobDef.name, {}, repeatOptions);
      this.logger.log(`Enabled cron job ${jobDef.jobId} in queue ${queueName}`);
      return { success: true, queue: queueName, jobId: jobDef.jobId };
    } finally {
      await queue.close();
    }
  }

  async triggerNow(key: string) {
    const { queueName } = this.parseKey(key);
    const queue = new Queue(queueName, { connection: bullConnection });
    try {
      const jobDef = this.getJobDefinition(key);
      if (!jobDef) {
        throw new NotFoundException(`Job definition not found for: ${key}`);
      }
      const job = await queue.add(jobDef.name, {}, { removeOnComplete: true });
      this.logger.log(
        `Triggered job ${jobDef.name} (id: ${job.id}) in queue ${queueName}`,
      );
      return {
        success: true,
        queue: queueName,
        jobName: jobDef.name,
        jobId: job.id,
      };
    } finally {
      await queue.close();
    }
  }

  private parseKey(key: string): { queueName: string; jobId: string } {
    const parts = key.split(':');
    if (parts.length < 2) {
      throw new NotFoundException(`Invalid job key format: ${key}`);
    }
    const jobId = parts.pop()!;
    const queueName = parts.join(':');
    if (!CRON_QUEUE_NAMES.includes(queueName as CronQueueName)) {
      throw new NotFoundException(`Unknown queue in key: ${queueName}`);
    }
    return { queueName, jobId };
  }

  private getJobDefinition(
    key: string,
  ): { name: string; jobId: string; pattern?: string; every?: number } | null {
    const defs: Record<
      string,
      { name: string; jobId: string; pattern?: string; every?: number }
    > = {
      'booking-release-queue:booking-release-repeater': {
        name: 'release-expired',
        jobId: 'booking-release-repeater',
        every: 60 * 1000,
      },
      'booking-reminder-queue:booking-reminder-checker': {
        name: 'check-upcoming-bookings',
        jobId: 'booking-reminder-checker',
        every: 6 * 60 * 60 * 1000,
      },
      'packing-reminder-queue:packing-reminder-checker': {
        name: 'check-upcoming-treks',
        jobId: 'packing-reminder-checker',
        every: 6 * 60 * 60 * 1000,
      },
      'weather-prefetch-queue:weather-prefetch-repeater': {
        name: 'prefetch-weather',
        jobId: 'weather-prefetch-repeater',
        every: 3 * 60 * 60 * 1000,
      },
      'group-expiry-queue:group-expiry-checker': {
        name: 'expire-stale-groups',
        jobId: 'group-expiry-checker',
        every: 60 * 60 * 1000,
      },
      'price-drop-queue:price-drop-checker': {
        name: 'check-price-drops',
        jobId: 'price-drop-checker',
        every: 24 * 60 * 60 * 1000,
      },
      'recommendation-builder-queue:recommendation-build': {
        name: 'build-candidates',
        jobId: 'recommendation-build',
        pattern: '0 */6 * * *',
      },
    };
    return defs[key] ?? null;
  }
}
