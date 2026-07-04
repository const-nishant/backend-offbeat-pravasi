import { redisConfig } from 'src/config/redis.config';
import type { ConnectionOptions } from 'bullmq';

export const bullConnection: ConnectionOptions = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};
