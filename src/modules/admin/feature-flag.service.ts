import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { createHash } from 'node:crypto';

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly repo: Repository<FeatureFlag>,
  ) {}

  async list() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  async get(id: string) {
    const flag = await this.repo.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return flag;
  }

  async getByKey(key: string) {
    return this.repo.findOne({ where: { key } });
  }

  async create(data: {
    key: string;
    description?: string;
    enabled?: boolean;
    percentage?: number;
    userSegment?: string;
  }) {
    const existing = await this.getByKey(data.key);
    if (existing) {
      throw new NotFoundException(`Flag with key '${data.key}' already exists`);
    }

    const flag = this.repo.create({
      key: data.key,
      description: data.description ?? null,
      enabled: data.enabled ?? false,
      percentage: data.percentage ?? 100,
      userSegment: data.userSegment ?? null,
    });

    const saved = await this.repo.save(flag);
    this.logger.log(`Created feature flag: ${data.key}`);
    return saved;
  }

  async update(
    id: string,
    data: {
      key?: string;
      description?: string;
      enabled?: boolean;
      percentage?: number;
      userSegment?: string | null;
    },
  ) {
    const flag = await this.repo.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');

    if (data.key !== undefined) flag.key = data.key;
    if (data.description !== undefined) flag.description = data.description;
    if (data.enabled !== undefined) flag.enabled = data.enabled;
    if (data.percentage !== undefined) flag.percentage = data.percentage;
    if (data.userSegment !== undefined) flag.userSegment = data.userSegment;

    const saved = await this.repo.save(flag);
    return saved;
  }

  async delete(id: string) {
    const flag = await this.repo.findOne({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    await this.repo.remove(flag);
    return { success: true };
  }

  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const flag = await this.getByKey(key);
    if (!flag) return false;
    if (!flag.enabled) return false;
    if (flag.percentage >= 100) return true;

    if (userId) {
      const hash = createHash('md5').update(`${key}:${userId}`).digest('hex');
      const bucket = parseInt(hash.slice(0, 8), 16) % 100;
      return bucket < flag.percentage;
    }

    return flag.enabled;
  }
}
