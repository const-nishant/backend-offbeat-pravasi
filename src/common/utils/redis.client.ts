import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { redisConfig } from '../../config/redis.config';

const redisLogger = new Logger('Redis');

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

  client.on('error', (err) => {
    if (!err.message.includes('ECONNREFUSED')) {
      redisLogger.error(`Connection error: ${err.message}`);
    }
  });

  client.on('connect', () => {
    redisLogger.log('Connected successfully');
  });

  return client;
};

export type RedisClient = Redis;
