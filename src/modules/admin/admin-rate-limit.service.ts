import { Injectable, Logger, Inject } from '@nestjs/common';
import type { RedisClient } from '../../common/utils/redis.client';

const OVERRIDE_TTL = 24 * 3600;

@Injectable()
export class AdminRateLimitService {
  private readonly logger = new Logger(AdminRateLimitService.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClient,
  ) {}

  async getConfig() {
    const keys = await this.redis.keys('ratelimit:overrides:*');
    const overrides: Record<string, unknown>[] = [];

    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) {
        const endpoint = key.replace('ratelimit:overrides:', '');
        const config = JSON.parse(raw);
        const ttl = await this.redis.ttl(key);
        overrides.push({
          endpoint: endpoint === '*' ? 'global' : endpoint,
          ...config,
          ttlSeconds: ttl > 0 ? ttl : OVERRIDE_TTL,
        });
      }
    }

    return {
      overrides,
      defaultConfig: {
        global: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
        auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
        admin: { windowMs: 15 * 60 * 1000, maxRequests: 200 },
      },
    };
  }

  async updateOverride(dto: {
    endpoint: string;
    windowMs: number;
    maxRequests: number;
  }) {
    const key = `ratelimit:overrides:${dto.endpoint}`;
    const value = JSON.stringify({
      windowMs: dto.windowMs,
      maxRequests: dto.maxRequests,
      updatedAt: new Date().toISOString(),
    });

    await this.redis.set(key, value, 'EX', OVERRIDE_TTL);
    this.logger.log(`Rate limit override set for ${dto.endpoint}`);

    return { success: true, endpoint: dto.endpoint, ttlSeconds: OVERRIDE_TTL };
  }

  async clearOverride(endpoint: string) {
    const key = `ratelimit:overrides:${endpoint}`;
    await this.redis.del(key);
    return { success: true, endpoint };
  }
}
