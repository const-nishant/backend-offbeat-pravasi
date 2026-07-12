import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Badge } from './entities/badge.entity';
import { BadgeAward } from './entities/badge-award.entity';

@Injectable()
export class AdminBadgeService {
  private readonly logger = new Logger(AdminBadgeService.name);

  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepo: Repository<Badge>,
    @InjectRepository(BadgeAward)
    private readonly awardRepo: Repository<BadgeAward>,
    private readonly dataSource: DataSource,
  ) {}

  async list() {
    return this.badgeRepo.find({ order: { name: 'ASC' } });
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    iconUrl?: string;
    category?: string;
    criteria?: Record<string, unknown>;
    isAutoAwardable?: boolean;
  }) {
    const existing = await this.badgeRepo.findOne({
      where: { slug: data.slug },
    });
    if (existing) throw new ConflictException('Badge slug already exists');

    const badge = this.badgeRepo.create(data);
    const saved = await this.badgeRepo.save(badge);
    this.logger.log(`Created badge: ${data.name}`);
    return saved;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      iconUrl: string;
      category: string;
      criteria: Record<string, unknown>;
      isAutoAwardable: boolean;
      isActive: boolean;
    }>,
  ) {
    const badge = await this.badgeRepo.findOne({ where: { id } });
    if (!badge) throw new NotFoundException('Badge not found');

    if (data.slug && data.slug !== badge.slug) {
      const dup = await this.badgeRepo.findOne({ where: { slug: data.slug } });
      if (dup) throw new ConflictException('Slug already in use');
    }

    Object.assign(badge, data);
    return this.badgeRepo.save(badge);
  }

  async remove(id: string) {
    const result = await this.badgeRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Badge not found');
    this.logger.log(`Deleted badge: ${id}`);
    return { success: true };
  }

  async award(
    badgeId: string,
    userId: string,
    awardedBy: string,
    reason?: string,
  ) {
    const badge = await this.badgeRepo.findOne({ where: { id: badgeId } });
    if (!badge) throw new NotFoundException('Badge not found');

    const existing = await this.awardRepo.findOne({
      where: { badgeId, userId },
    });
    if (existing) throw new ConflictException('User already has this badge');

    const award = this.awardRepo.create({
      badgeId,
      userId,
      source: 'admin',
      awardedBy,
      reason: reason ?? null,
    });
    const saved = await this.awardRepo.save(award);
    this.logger.log(`Awarded badge ${badgeId} to user ${userId}`);
    return saved;
  }

  async revoke(badgeId: string, userId: string) {
    const result = await this.awardRepo.delete({ badgeId, userId });
    if (result.affected === 0) throw new NotFoundException('Award not found');
    this.logger.log(`Revoked badge ${badgeId} from user ${userId}`);
    return { success: true };
  }

  async stats() {
    const rows = await this.dataSource.query(
      `SELECT
         b.id,
         b.name,
         COUNT(ba.id) AS awarded_count,
         COUNT(DISTINCT ba.user_id) AS unique_recipients,
         MAX(ba.awarded_at) AS most_recent_award
       FROM badges b
       LEFT JOIN badge_awards ba ON ba.badge_id = b.id
       GROUP BY b.id, b.name
       ORDER BY awarded_count DESC`,
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      awardedCount: Number(r.awarded_count),
      uniqueRecipients: Number(r.unique_recipients),
      mostRecentAward: r.most_recent_award,
    }));
  }
}
