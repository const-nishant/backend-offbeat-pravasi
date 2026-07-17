import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, And } from 'typeorm';
import { PricingCampaign } from './entities/pricing-campaign.entity';

@Injectable()
export class AdminPricingCampaignService {
  private readonly logger = new Logger(AdminPricingCampaignService.name);

  constructor(
    @InjectRepository(PricingCampaign)
    private readonly repo: Repository<PricingCampaign>,
  ) {}

  async list() {
    const now = new Date();
    const all = await this.repo.find({ order: { createdAt: 'DESC' } });
    return all.map((c) => ({
      ...c,
      status: c.endDate < now ? 'expired' : c.startDate > now ? 'scheduled' : 'active',
    }));
  }

  async create(data: {
    name: string;
    trekIds: string[];
    discountType: string;
    discountValue: number;
    maxCap?: number;
    minBookingAmount?: number;
    startDate: Date;
    endDate: Date;
  }) {
    const campaign = this.repo.create({
      name: data.name,
      trekIds: data.trekIds,
      discountType: data.discountType as any,
      discountValue: data.discountValue,
      maxCap: data.maxCap ?? null,
      minBookingAmount: data.minBookingAmount ?? null,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    const saved = await this.repo.save(campaign);
    this.logger.log(`Created pricing campaign: ${data.name}`);
    return saved;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      trekIds: string[];
      discountType: string;
      discountValue: number;
      maxCap: number | null;
      minBookingAmount: number | null;
      startDate: Date;
      endDate: Date;
      isActive: boolean;
    }>,
  ) {
    const campaign = await this.repo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');

    Object.assign(campaign, data);
    return this.repo.save(campaign);
  }
}
