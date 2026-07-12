import { Queue } from 'bullmq';
import { bullConnection } from './config';

export const notificationQueue = new Queue('notification-queue', {
  connection: bullConnection,
});

export const bookingReminderQueue = new Queue('booking-reminder-queue', {
  connection: bullConnection,
});

export const cleanupQueue = new Queue('cleanup-queue', {
  connection: bullConnection,
});

export const recommendationQueue = new Queue('recommendation-builder-queue', {
  connection: bullConnection,
});

export const bookingReleaseQueue = new Queue('booking-release-queue', {
  connection: bullConnection,
});

export const ticketPdfQueue = new Queue('ticket-pdf-queue', {
  connection: bullConnection,
});

export const weatherPrefetchQueue = new Queue('weather-prefetch-queue', {
  connection: bullConnection,
});

export const checkInFirstWarningQueue = new Queue(
  'checkin-first-warning-queue',
  { connection: bullConnection },
);

export const checkInEmergencyQueue = new Queue('checkin-emergency-queue', {
  connection: bullConnection,
});

export const groupExpiryQueue = new Queue('group-expiry-queue', {
  connection: bullConnection,
});

export const referralRewardDeliveryQueue = new Queue(
  'referral-reward-delivery-queue',
  { connection: bullConnection },
);

export const priceDropQueue = new Queue('price-drop-queue', {
  connection: bullConnection,
});

export const packingReminderQueue = new Queue('packing-reminder-queue', {
  connection: bullConnection,
});
