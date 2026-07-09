import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, DiscountType } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';

@Injectable()
export class AdminCouponService {
  private readonly logger = new Logger(AdminCouponService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly repo: Repository<Coupon>,
    @InjectRepository(CouponRedemption)
    private readonly redemptionRepo: Repository<CouponRedemption>,
  ) {}

  async list() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async get(id: string) {
    const coupon = await this.repo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(data: {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountCap?: number;
    minBookingAmount?: number;
    maxUses?: number;
    applicableTrekIds?: string[];
    validFrom?: Date;
    validTo?: Date;
  }) {
    const coupon = this.repo.create({
      code: data.code.toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscountCap: data.maxDiscountCap ?? null,
      minBookingAmount: data.minBookingAmount ?? 0,
      maxUses: data.maxUses ?? null,
      applicableTrekIds: data.applicableTrekIds ?? [],
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
    });
    const saved = await this.repo.save(coupon);
    this.logger.log(`Created coupon: ${saved.code}`);
    return saved;
  }

  async update(
    id: string,
    data: {
      code?: string;
      discountType?: DiscountType;
      discountValue?: number;
      maxDiscountCap?: number | null;
      minBookingAmount?: number;
      maxUses?: number | null;
      applicableTrekIds?: string[];
      validFrom?: Date | null;
      validTo?: Date | null;
      isActive?: boolean;
    },
  ) {
    const coupon = await this.repo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (data.code !== undefined) coupon.code = data.code.toUpperCase();
    if (data.discountType !== undefined)
      coupon.discountType = data.discountType;
    if (data.discountValue !== undefined)
      coupon.discountValue = data.discountValue;
    if (data.maxDiscountCap !== undefined)
      coupon.maxDiscountCap = data.maxDiscountCap;
    if (data.minBookingAmount !== undefined)
      coupon.minBookingAmount = data.minBookingAmount;
    if (data.maxUses !== undefined) coupon.maxUses = data.maxUses;
    if (data.applicableTrekIds !== undefined)
      coupon.applicableTrekIds = data.applicableTrekIds;
    if (data.validFrom !== undefined) coupon.validFrom = data.validFrom;
    if (data.validTo !== undefined) coupon.validTo = data.validTo;
    if (data.isActive !== undefined) coupon.isActive = data.isActive;

    const saved = await this.repo.save(coupon);
    return saved;
  }

  async expire(id: string) {
    const coupon = await this.repo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    coupon.isActive = false;
    coupon.validTo = new Date();
    await this.repo.save(coupon);
    this.logger.log(`Expired coupon: ${coupon.code}`);
    return { success: true };
  }

  async getRedemptions(couponId: string) {
    return this.redemptionRepo.find({
      where: { couponId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
