import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralTierConfig } from '../referrals/entities/referral-tier-config.entity';
import { PlatformSettingsService } from './platform-settings.service';

@Injectable()
export class AdminReferralTierService {
  private readonly logger = new Logger(AdminReferralTierService.name);

  constructor(
    @InjectRepository(ReferralTierConfig)
    private readonly repo: Repository<ReferralTierConfig>,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async listTiers() {
    return this.repo.find({ order: { minSuccessfulReferrals: 'ASC' } });
  }

  async createTier(data: {
    tier: string;
    minSuccessfulReferrals: number;
    rewardPerReferralInr: number;
    refereeDiscountInr: number;
  }) {
    const entity = this.repo.create(data);
    const saved = await this.repo.save(entity);
    this.logger.log(`Created referral tier: ${data.tier}`);
    return saved;
  }

  async updateTier(
    id: string,
    data: {
      tier?: string;
      minSuccessfulReferrals?: number;
      rewardPerReferralInr?: number;
      refereeDiscountInr?: number;
    },
  ) {
    const tier = await this.repo.findOne({ where: { id } });
    if (!tier) throw new NotFoundException('Referral tier not found');

    if (data.tier !== undefined) tier.tier = data.tier as any;
    if (data.minSuccessfulReferrals !== undefined)
      tier.minSuccessfulReferrals = data.minSuccessfulReferrals;
    if (data.rewardPerReferralInr !== undefined)
      tier.rewardPerReferralInr = data.rewardPerReferralInr;
    if (data.refereeDiscountInr !== undefined)
      tier.refereeDiscountInr = data.refereeDiscountInr;

    return this.repo.save(tier);
  }

  async deleteTier(id: string) {
    const tier = await this.repo.findOne({ where: { id } });
    if (!tier) throw new NotFoundException('Referral tier not found');
    await this.repo.remove(tier);
    return { success: true };
  }

  async getSettings() {
    const settings = await this.platformSettings.getSettings();
    return {
      pointsToInrRate: settings.pointsToInrRate ?? 1,
      minPayoutThreshold: settings.minPayoutThreshold ?? 100,
      bonusForFirstReferral: settings.bonusForFirstReferral ?? 50,
    };
  }

  async updateSettings(dto: {
    pointsToInrRate?: number;
    minPayoutThreshold?: number;
    bonusForFirstReferral?: number;
  }) {
    const settings = await this.platformSettings.getSettings();
    const updated = {
      ...settings,
      ...(dto.pointsToInrRate !== undefined
        ? { pointsToInrRate: dto.pointsToInrRate }
        : {}),
      ...(dto.minPayoutThreshold !== undefined
        ? { minPayoutThreshold: dto.minPayoutThreshold }
        : {}),
      ...(dto.bonusForFirstReferral !== undefined
        ? { bonusForFirstReferral: dto.bonusForFirstReferral }
        : {}),
    };
    await this.platformSettings.updateSettings(updated);
    return updated;
  }
}
