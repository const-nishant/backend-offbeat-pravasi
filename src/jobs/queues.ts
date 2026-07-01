import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.config';

const connection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

export const notificationQueue = new Queue('notification-queue', {
  connection,
});

export const storyExpiryQueue = new Queue('story-expiry-queue', {
  connection,
});

export const bookingReminderQueue = new Queue('booking-reminder-queue', {
  connection,
});

export const cleanupQueue = new Queue('cleanup-queue', {
  connection,
});

export const recommendationQueue = new Queue('recommendation-builder-queue', {
  connection,
});

export const bookingReleaseQueue = new Queue('booking-release-queue', {
  connection,
});

export const ticketPdfQueue = new Queue('ticket-pdf-queue', {
  connection,
});

export const weatherPrefetchQueue = new Queue('weather-prefetch-queue', {
  connection,
});

await (async () => {
  try {
    await recommendationQueue.add(
      'build-candidates',
      {},
      {
        jobId: 'recommendation-build',
        repeat: {
          pattern: '0 * * * *',
        },
      },
    );
  } catch (err) {
    console.warn(
      'Failed to schedule recommendation build:',
      err instanceof Error ? err.message : String(err),
    );
  }
})();
