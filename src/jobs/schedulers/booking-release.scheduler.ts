import { Queue } from 'bullmq';
import { redisConfig } from '../../config/redis.config';

// Scheduler that enqueues a repeating job to release expired bookings every minute
const bookingReleaseQueue = new Queue('booking-release-queue', {
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
  },
});

void (async () => {
  try {
    // add a single repeating job (idempotent by jobId)
    await bookingReleaseQueue.add(
      'release-expired',
      {},
      {
        jobId: 'booking-release-repeater',
        removeOnComplete: true,
        repeat: { every: 60 * 1000 },
      },
    );

    console.debug('Booking release scheduler registered (every 60s)');
  } catch (_e) {
    console.error('Failed to register booking release scheduler', _e);
  }
})();
