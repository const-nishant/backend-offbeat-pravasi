import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { RedisClient } from '../../common/utils/redis.client';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
  ) {}

  async baseHealth() {
    const checks = await Promise.allSettled([
      this.redis.ping().then(() => true),
      this.dataSource.query('SELECT 1').then(() => true),
    ]);

    const redisOk = checks[0].status === 'fulfilled' && checks[0].value;
    const dbOk = checks[1].status === 'fulfilled' && checks[1].value;
    const allOk = redisOk && dbOk;

    return {
      success: allOk,
      message: allOk ? 'All services operational' : 'Degraded service',
      data: {
        uptimeSeconds: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          redis: redisOk ? 'ok' : 'unreachable',
          database: dbOk ? 'ok' : 'unreachable',
        },
      },
    };
  }
}
