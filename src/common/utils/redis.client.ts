import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import configuration from '../../config/configuration';

const redisLogger = new Logger('Redis');

export const createRedisClient = (): Redis => {
  const client = new Redis({
    host: configuration().redis.host,
    port: configuration().redis.port,
    password: configuration().redis.password,
    db: configuration().redis.db,
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
