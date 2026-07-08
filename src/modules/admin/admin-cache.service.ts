import { Injectable, Logger, Inject } from '@nestjs/common';
import type { RedisClient } from '../../common/utils/redis.client';

@Injectable()
export class AdminCacheService {
  private readonly logger = new Logger(AdminCacheService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClient) {}

  async invalidate(pattern: string) {
    const keys = await this.scanKeys(pattern);
    if (keys.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    const pipeline = this.redis.pipeline();
    keys.forEach((key) => pipeline.del(key));
    await pipeline.exec();
    this.logger.log(`Invalidated ${keys.length} keys matching "${pattern}"`);
    return { success: true, deletedCount: keys.length };
  }

  async getStats() {
    const info = await this.redis.info('memory');
    const dbSize = await this.redis.dbsize();
    const usedMemory = this.parseInfoValue(info, 'used_memory_human');
    const usedMemoryRss = this.parseInfoValue(info, 'used_memory_rss_human');
    const peakMemory = this.parseInfoValue(info, 'used_memory_peak_human');
    const fragmentation = this.parseInfoValue(info, 'mem_fragmentation_ratio');

    return {
      totalKeys: dbSize,
      usedMemory,
      usedMemoryRss,
      peakMemory,
      fragmentationRatio: fragmentation,
    };
  }

  async getKeys(pattern: string) {
    const keys = await this.scanKeys(pattern);
    const result = await Promise.all(
      keys.map(async (key) => {
        const ttl = await this.redis.ttl(key);
        const type = await this.redis.type(key);
        return { key, ttl: Math.max(0, ttl), type };
      }),
    );
    return result;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  private parseInfoValue(info: string, field: string): string | null {
    const match = info.match(new RegExp(`^${field}:(.+)$`, 'm'));
    return match ? match[1].trim() : null;
  }
}
