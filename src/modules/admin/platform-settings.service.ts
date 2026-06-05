import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from './entities/platform-settings.entity';
import { RedisService } from '../../common/utils/redis.service';

const REDIS_KEY = 'platform:settings';

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepo: Repository<PlatformSettings>,
    private readonly redisService: RedisService,
  ) {}

  async getSettings(): Promise<any> {
    try {
      const cached = await this.redisService.get(REDIS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      this.logger.warn('Redis get failed for platform settings');
    }

    const row = await this.settingsRepo.findOne({
      where: { key: 'platform_settings' },
    });
    const settings = row?.settings || {};
    try {
      await this.redisService.set(REDIS_KEY, JSON.stringify(settings), 300);
    } catch {
      this.logger.warn('Redis set failed for platform settings');
    }
    return settings;
  }

  async updateSettings(settings: any, actor?: any) {
    let row: any = await this.settingsRepo.findOne({
      where: { key: 'platform_settings' },
    });
    if (!row) {
      row = this.settingsRepo.create({
        key: 'platform_settings',
        settings,
        changedBy: actor?.id,
        changedAt: new Date(),
      } as any);
    } else {
      row.settings = settings;
      row.changedBy = actor?.id;
      row.changedAt = new Date();
    }
    const saved = await this.settingsRepo.save(row as any);
    try {
      await this.redisService.del(REDIS_KEY);
    } catch {
      this.logger.warn('Redis del failed for platform settings');
    }
    return saved;
  }
}
