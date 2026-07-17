import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RedisClient } from '../../common/utils/redis.client';
import { IpAccessRule, IpListType } from './entities/ip-access-rule.entity';

@Injectable()
export class AdminIpFilterService {
  private readonly logger = new Logger(AdminIpFilterService.name);

  constructor(
    @InjectRepository(IpAccessRule)
    private readonly repo: Repository<IpAccessRule>,
    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClient,
  ) {}

  private redisKey(listType: IpListType): string {
    return `ip:${listType}`;
  }

  private async syncToRedis(rule: IpAccessRule) {
    const key = this.redisKey(rule.listType);
    if (rule.expiresAt && new Date(rule.expiresAt) < new Date()) {
      await this.redis.srem(key, rule.ipCidr);
    } else {
      await this.redis.sadd(key, rule.ipCidr);
    }
  }

  async list(listType: IpListType) {
    return this.repo.find({
      where: { listType },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    listType: IpListType,
    data: { ipCidr: string; reason?: string; expiresAt?: Date },
  ) {
    const rule = this.repo.create({
      listType,
      ipCidr: data.ipCidr,
      reason: data.reason ?? null,
      expiresAt: data.expiresAt ?? null,
    });
    const saved = await this.repo.save(rule);
    await this.syncToRedis(saved);
    this.logger.log(`Added ${listType} rule: ${data.ipCidr}`);
    return saved;
  }

  async update(
    id: string,
    data: { ipCidr?: string; reason?: string; expiresAt?: Date | null },
  ) {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('IP rule not found');

    await this.redis.srem(this.redisKey(rule.listType), rule.ipCidr);

    if (data.ipCidr !== undefined) rule.ipCidr = data.ipCidr;
    if (data.reason !== undefined) rule.reason = data.reason;
    if (data.expiresAt !== undefined) rule.expiresAt = data.expiresAt;

    const saved = await this.repo.save(rule);
    await this.syncToRedis(saved);
    return saved;
  }

  async delete(id: string) {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('IP rule not found');

    await this.repo.remove(rule);
    await this.redis.srem(this.redisKey(rule.listType), rule.ipCidr);
    this.logger.log(`Removed ${rule.listType} rule: ${rule.ipCidr}`);
    return { success: true };
  }

  async getAudit(listType: IpListType) {
    const qb = this.repo.createQueryBuilder('r');
    qb.where('r.listType = :listType', { listType });
    qb.andWhere('r.hitCount > 0');
    qb.orderBy('r.lastHitAt', 'DESC');
    qb.take(100);
    return qb.getMany();
  }

  async loadAllToRedis() {
    const rules = await this.repo.find();

    await this.redis.del('ip:blocklist', 'ip:allowlist');

    for (const rule of rules) {
      if (rule.expiresAt && new Date(rule.expiresAt) < new Date()) continue;
      const key = this.redisKey(rule.listType);
      await this.redis.sadd(key, rule.ipCidr);
    }

    this.logger.log(`Loaded ${rules.length} IP rules into Redis`);
  }
}
