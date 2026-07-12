import configuration from 'src/config/configuration';
import type { ConnectionOptions } from 'bullmq';

export const bullConnection: ConnectionOptions = {
  host: configuration().redis.host,
  port: configuration().redis.port,
  password: configuration().redis.password,
  db: configuration().redis.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};
