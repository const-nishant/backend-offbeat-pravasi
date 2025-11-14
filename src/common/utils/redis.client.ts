import { Redis } from 'ioredis';
import { redisConfig } from '../../config/redis.config';

export const createRedisClient = (): Redis => {
  const client = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  // Handle connection errors gracefully
  client.on('error', (err) => {
    // Only log if not a connection refused error (will retry)
    if (!err.message.includes('ECONNREFUSED')) {
      console.error('[Redis] Connection error:', err.message);
    }
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  return client;
};

export type RedisClient = Redis;
