import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromotionalBanner } from './entities/promotional-banner.entity';

@Injectable()
export class AdminBannerService {
  private readonly logger = new Logger(AdminBannerService.name);

  constructor(
    @InjectRepository(PromotionalBanner)
    private readonly repo: Repository<PromotionalBanner>,
  ) {}

  async list() {
    return this.repo.find({ order: { priority: 'DESC', createdAt: 'DESC' } });
  }

  async create(data: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    ctaText?: string;
    ctaLink?: string;
    placement: string;
    startDate: Date;
    endDate: Date;
    priority?: number;
  }) {
    const banner = this.repo.create(data as any);
    const saved = await this.repo.save(banner);
    this.logger.log(`Created banner: ${data.title}`);
    return saved;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      subtitle: string;
      imageUrl: string;
      ctaText: string;
      ctaLink: string;
      placement: string;
      startDate: Date;
      endDate: Date;
      priority: number;
      isActive: boolean;
    }>,
  ) {
    const banner = await this.repo.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    Object.assign(banner, data);
    return this.repo.save(banner);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Banner not found');
    this.logger.log(`Deleted banner: ${id}`);
    return { success: true };
  }

  async stats() {
    const rows = await this.repo.find({ select: ['id', 'title', 'impressions', 'clicks'] });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      impressions: b.impressions,
      clicks: b.clicks,
      ctr: b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(2) + '%' : '0%',
    }));
  }
}
