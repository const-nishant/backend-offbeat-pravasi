import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { ormConfig } from '../../config/ormconfig';
import { DataSource } from 'typeorm';
import { redisConfig } from '../../config/redis.config';

const dataSource = new DataSource({ ...ormConfig, synchronize: false });

export const bookingReleaseWorker = new Worker(
  'booking-release-queue',
  async (_job: Job) => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const res = await dataSource.query(`
      UPDATE bookings
      SET status = 'FAILED', metadata = jsonb_set(COALESCE(metadata, '{}'), '{releasedAt}', to_jsonb(now() at time zone 'utc')), updated_at = now()
      WHERE status = 'PENDING' AND hold_expires_at <= now()
      RETURNING id;
    `);

    return { released: res.length };
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
