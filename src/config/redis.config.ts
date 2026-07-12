import configuration from './configuration';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

// ponytail: defaults from configuration.ts (single source)
const { redis } = configuration();

export const redisConfig: RedisConfig = {
  host: redis.host,
  port: redis.port,
  password: redis.password,
  db: redis.db,
};
