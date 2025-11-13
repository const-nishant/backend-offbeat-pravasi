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
