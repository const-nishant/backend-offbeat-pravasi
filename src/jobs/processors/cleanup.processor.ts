import { Worker, Job } from 'bullmq';
import { redisConfig } from '../../config/redis.config';
import { Redis } from 'ioredis';

interface CleanupJobPayload {
  task:
    | 'clear-expired-otps'
    | 'clear-old-refresh-tokens'
    | 'clear-expired-stories';
}

const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Cleanup Worker
 * Handles automated cleanup tasks such as:
 * - Removing expired OTP keys
 * - Removing old refresh tokens from Redis
 * - Cleaning expired stories
 *
 * Runs on schedule using Cron or background triggers.
 */
export const cleanupWorker = new Worker(
  'cleanup-queue',
  async (job: Job<CleanupJobPayload>) => {
    const { task } = job.data;

    switch (task) {
      case 'clear-expired-otps':
        await clearExpiredOtps();
        break;

      case 'clear-old-refresh-tokens':
        await clearOldRefreshTokens();
        break;

      case 'clear-expired-stories':
        await clearExpiredStories();
        break;

      default:
        throw new Error(`Unknown cleanup task: ${task}`);
    }

    return { status: 'ok', executed: task };
  },
  {
    connection: {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
    },
  },
);

// ------------------------------
// Cleanup Task Implementations
// ------------------------------

/**
 * OTP Keys follow pattern from CacheKeys.otpEmail()
 * Pattern: otp:email:<email>
 */
async function clearExpiredOtps(): Promise<void> {
  const stream = redis.scanStream({
    match: 'otp:email:*', // Matches CacheKeys.otpEmail() pattern
    count: 100,
  });

  stream.on('data', (keys: string[]) => {
    keys.forEach(async (key) => {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
      }
    });
  });
}

/**
 * Refresh tokens follow pattern from CacheKeys.refreshSession()
 * Pattern: refresh:<userId>:<sessionId>
 */
async function clearOldRefreshTokens(): Promise<void> {
  const stream = redis.scanStream({
    match: 'refresh:*', // Matches CacheKeys.refreshSession() pattern
    count: 100,
  });

  stream.on('data', (keys: string[]) => {
    keys.forEach(async (key) => {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
      }
    });
  });
}

/**
 * Story expiration cleanup
 * Stories follow pattern from CacheKeys.story()
 * Pattern: story:<storyId>
 * If you're using DB for stories, delete from DB.
 * If using Redis storage for TTL, clean keys.
 */
async function clearExpiredStories(): Promise<void> {
  const stream = redis.scanStream({
    match: 'story:*', // Matches CacheKeys.story() pattern
    count: 100,
  });

  stream.on('data', (keys: string[]) => {
    keys.forEach(async (key) => {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
      }
    });
  });
}
