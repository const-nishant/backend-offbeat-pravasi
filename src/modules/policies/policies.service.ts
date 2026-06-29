import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { CancellationTier } from './entities/cancellation-tier.entity';
import { TrekPolicy } from './entities/trek-policy.entity';
import { BookingPolicySnapshot } from './entities/booking-policy-snapshot.entity';
import { CreatePolicyDto } from './dtos/create-policy.dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectRepository(CancellationPolicy)
    private readonly policyRepo: Repository<CancellationPolicy>,
    @InjectRepository(CancellationTier)
    private readonly tierRepo: Repository<CancellationTier>,
    @InjectRepository(TrekPolicy)
    private readonly trekPolicyRepo: Repository<TrekPolicy>,
    @InjectRepository(BookingPolicySnapshot)
    private readonly snapshotRepo: Repository<BookingPolicySnapshot>,
  ) {}

  async findAll(): Promise<CancellationPolicy[]> {
    return this.policyRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<CancellationPolicy> {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async getDefault(): Promise<CancellationPolicy> {
    const policy = await this.policyRepo.findOne({
      where: { isDefault: true },
    });
    if (!policy) throw new NotFoundException('No default policy found');
    return policy;
  }

  async create(dto: CreatePolicyDto): Promise<CancellationPolicy> {
    if (dto.isDefault) {
      await this.clearDefaultFlag();
    }

    const policy = this.policyRepo.create({
      name: dto.name,
      description: dto.description,
      isDefault: dto.isDefault ?? false,
    });
    const saved = await this.policyRepo.save(policy);

    const tierEntities = dto.tiers.map((t) => {
      const tier = new CancellationTier();
      tier.policyId = saved.id;
      tier.fromHoursBeforeStart = t.fromHoursBeforeStart;
      tier.toHoursBeforeStart = t.toHoursBeforeStart;
      tier.refundPercentage = t.refundPercentage;
      tier.sortOrder = t.sortOrder;
      return tier;
    });
    await this.tierRepo.save(tierEntities);

    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: Partial<CreatePolicyDto>,
  ): Promise<CancellationPolicy> {
    const policy = await this.findOne(id);

    if (dto.isDefault && !policy.isDefault) {
      await this.clearDefaultFlag();
    }

    if (dto.name !== undefined) policy.name = dto.name;
    if (dto.description !== undefined) policy.description = dto.description;
    if (dto.isDefault !== undefined) policy.isDefault = dto.isDefault;
    await this.policyRepo.save(policy);

    if (dto.tiers) {
      await this.tierRepo.delete({ policyId: id });
      const tierEntities = dto.tiers.map((t) => {
        const tier = new CancellationTier();
        tier.policyId = id;
        tier.fromHoursBeforeStart = t.fromHoursBeforeStart;
        tier.toHoursBeforeStart = t.toHoursBeforeStart;
        tier.refundPercentage = t.refundPercentage;
        tier.sortOrder = t.sortOrder;
        return tier;
      });
      await this.tierRepo.save(tierEntities);
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const policy = await this.findOne(id);
    await this.policyRepo.remove(policy);
  }

  async getForTrek(trekId: string): Promise<CancellationPolicy> {
    const link = await this.trekPolicyRepo.findOne({
      where: { trekId },
      relations: ['policy'],
    });
    if (link) {
      return this.findOne(link.policyId);
    }
    return this.getDefault();
  }

  async assignToTrek(trekId: string, policyId: string): Promise<void> {
    await this.findOne(policyId);
    const existing = await this.trekPolicyRepo.findOne({ where: { trekId } });
    if (existing) {
      existing.policyId = policyId;
      await this.trekPolicyRepo.save(existing);
    } else {
      await this.trekPolicyRepo.save(
        this.trekPolicyRepo.create({ trekId, policyId }),
      );
    }
  }

  async createSnapshot(bookingId: string, trekId: string): Promise<void> {
    const policy = await this.getForTrek(trekId);
    const tiers = policy.tiers.map((t) => ({
      fromHours: t.fromHoursBeforeStart,
      toHours: t.toHoursBeforeStart ?? undefined,
      refundPercentage: t.refundPercentage,
      sortOrder: t.sortOrder,
    }));
    const snapshot = this.snapshotRepo.create({
      bookingId,
      policyName: policy.name,
      tiers,
    });
    await this.snapshotRepo.save(snapshot);
  }

  async calculateRefund(
    bookingId: string,
    totalAmountInr: number,
    trekStartDate: Date,
  ): Promise<{
    refundPercentage: number;
    refundAmount: number;
    policyName: string;
  }> {
    let tiers: {
      fromHours: number;
      toHours?: number;
      refundPercentage: number;
      sortOrder: number;
    }[];
    let policyName: string;

    const snapshot = await this.snapshotRepo.findOne({ where: { bookingId } });
    if (snapshot) {
      tiers = snapshot.tiers;
      policyName = snapshot.policyName;
    } else {
      throw new NotFoundException('No policy snapshot found for this booking');
    }

    const now = new Date();
    const hoursUntilStart =
      (new Date(trekStartDate).getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart <= 0) {
      return { refundPercentage: 0, refundAmount: 0, policyName };
    }

    const sorted = [...tiers].sort((a, b) => b.sortOrder - a.sortOrder);
    for (const tier of sorted) {
      if (hoursUntilStart >= tier.fromHours) {
        const upperBound = tier.toHours ?? 0;
        if (
          tier.toHours === undefined ||
          hoursUntilStart <= upperBound ||
          upperBound === 0
        ) {
          const refundAmount = Math.round(
            (totalAmountInr * tier.refundPercentage) / 100,
          );
          return {
            refundPercentage: tier.refundPercentage,
            refundAmount,
            policyName,
          };
        }
      }
    }

    return { refundPercentage: 0, refundAmount: 0, policyName };
  }

  private async clearDefaultFlag(): Promise<void> {
    await this.policyRepo.update({ isDefault: true }, { isDefault: false });
  }
}
