import { Redis } from 'ioredis';
import { redisConfig } from '../../config/redis.config';

export const createRedisClient = (): Redis => {
  return new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

export type RedisClient = Redis;
