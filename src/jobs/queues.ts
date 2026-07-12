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

export const checkInFirstWarningQueue = new Queue(
  'checkin-first-warning-queue',
  { connection },
);

export const checkInEmergencyQueue = new Queue('checkin-emergency-queue', {
  connection,
});

export const groupExpiryQueue = new Queue('group-expiry-queue', {
  connection,
});

export const referralRewardDeliveryQueue = new Queue(
  'referral-reward-delivery-queue',
  { connection },
);

export const priceDropQueue = new Queue('price-drop-queue', { connection });
