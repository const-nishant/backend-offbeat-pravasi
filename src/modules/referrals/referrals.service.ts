import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral } from './entities/referral.entity';
import { ReferralTierConfig } from './entities/referral-tier-config.entity';
import { User } from '../users/entities/user.entity';
import { ReferralTier } from './enums/referral-tier.enum';
import { ReferralStatus } from './enums/referral-status.enum';
import { RewardType } from './enums/reward-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly codeRepo: Repository<ReferralCode>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(ReferralTierConfig)
    private readonly tierConfigRepo: Repository<ReferralTierConfig>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOrGenerateCode(userId: string): Promise<ReferralCode> {
    const existing = await this.codeRepo.findOne({ where: { userId } });
    if (existing) return existing;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const code = await this.generateUniqueCode();

    const referralCode = this.codeRepo.create({
      userId,
      code,
      tier: ReferralTier.BASE,
    });

    return this.codeRepo.save(referralCode);
  }

  async getMyReferrals(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Referral[];
    meta: ReturnType<typeof buildPaginationMeta>;
  }> {
    const code = await this.codeRepo.findOne({ where: { userId } });
    if (!code) return { data: [], meta: buildPaginationMeta(page, limit, 0) };

    const { skip, take } = getPagination({ page, limit });

    const [data, total] = await this.referralRepo.findAndCount({
      where: { referrerCodeId: code.id },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async getCodeInfo(
    code: string,
  ): Promise<{ referrerName: string; discountAmount: number; code: string }> {
    const referralCode = await this.codeRepo.findOne({
      where: { code },
    });
    if (!referralCode) throw new NotFoundException('Invalid referral code');

    const referrer = await this.userRepo.findOne({
      where: { id: referralCode.userId },
    });
    if (!referrer) throw new NotFoundException('Referrer not found');

    const tierConfig = await this.tierConfigRepo.findOne({
      where: { tier: referralCode.tier },
    });

    const discountAmount = tierConfig?.refereeDiscountInr ?? 0;

    return {
      referrerName: referrer.fullName ?? referrer.email,
      discountAmount,
      code: referralCode.code,
    };
  }

  async claimReferral(code: string, refereeUserId: string): Promise<Referral> {
    const referralCode = await this.codeRepo.findOne({ where: { code } });
    if (!referralCode) throw new NotFoundException('Invalid referral code');

    if (referralCode.userId === refereeUserId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    const referee = await this.userRepo.findOne({
      where: { id: refereeUserId },
    });
    if (!referee) throw new NotFoundException('Referee user not found');

    const existing = await this.referralRepo.findOne({
      where: {
        referrerCodeId: referralCode.id,
        refereeEmail: referee.email,
      },
    });

    if (existing) {
      if (existing.refereeUserId) {
        throw new BadRequestException('Referral already claimed');
      }
      existing.refereeUserId = refereeUserId;
      return this.referralRepo.save(existing);
    }

    const referral = this.referralRepo.create({
      referrerCodeId: referralCode.id,
      refereeUserId,
      refereeEmail: referee.email,
      status: ReferralStatus.PENDING,
    });

    return this.referralRepo.save(referral);
  }

  async onBookingCompleted(bookingUserId: string): Promise<void> {
    const referral = await this.referralRepo.findOne({
      where: { refereeUserId: bookingUserId },
    });

    if (!referral || referral.status !== ReferralStatus.PENDING) return;

    referral.status = ReferralStatus.COMPLETED;
    await this.referralRepo.save(referral);

    await this.deliverReward(referral.id);
  }

  async deliverReward(referralId: string): Promise<void> {
    const referral = await this.referralRepo.findOne({
      where: { id: referralId },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.status !== ReferralStatus.COMPLETED) return;

    const code = await this.codeRepo.findOne({
      where: { id: referral.referrerCodeId },
    });
    if (!code) throw new NotFoundException('Referral code not found');

    const tierConfig = await this.tierConfigRepo.findOne({
      where: { tier: code.tier },
    });

    const rewardValue = tierConfig?.rewardPerReferralInr ?? 0;

    if (rewardValue > 0) {
      await this.userRepo.increment(
        { id: code.userId },
        'userPoints',
        rewardValue,
      );
    }

    referral.rewardType = RewardType.POINTS;
    referral.rewardValueInr = rewardValue;
    referral.status = ReferralStatus.REWARDED;
    referral.rewardDeliveredAt = new Date();
    await this.referralRepo.save(referral);

    code.successfulReferrals += 1;
    code.totalEarnedInr += rewardValue;
    await this.codeRepo.save(code);

    await this.recalculateTier(code.userId);

    await this.notificationsService
      .sendPushToUser(
        code.userId,
        'Referral Reward Earned!',
        `You earned ₹${rewardValue} for referring ${referral.refereeEmail}. Keep sharing your code!`,
        NotificationType.BOOKING_CONFIRMED,
        { referralId: referral.id, rewardValue },
      )
      .catch((err) =>
        this.logger.warn(`Referral reward notification failed: ${err.message}`),
      );

    if (referral.refereeUserId) {
      await this.notificationsService
        .sendPushToUser(
          referral.refereeUserId,
          'Welcome! Your referrer got a reward',
          `Thanks for signing up via a referral. You get ₹${tierConfig?.refereeDiscountInr ?? 0} off your first trek!`,
          NotificationType.BOOKING_CONFIRMED,
          { referralId: referral.id },
        )
        .catch((err) =>
          this.logger.warn(`Referee notification failed: ${err.message}`),
        );
    }
  }

  async recalculateTier(userId: string): Promise<void> {
    const code = await this.codeRepo.findOne({ where: { userId } });
    if (!code) return;

    const tiers = await this.tierConfigRepo.find({
      order: { minSuccessfulReferrals: 'DESC' },
    });

    let newTier = ReferralTier.BASE;
    for (const t of tiers) {
      if (code.successfulReferrals >= t.minSuccessfulReferrals) {
        newTier = t.tier;
        break;
      }
    }

    if (newTier !== code.tier) {
      code.tier = newTier;
      await this.codeRepo.save(code);

      this.logger.log(
        `User ${userId} upgraded to ${newTier} tier (${code.successfulReferrals} successful referrals)`,
      );
    }
  }

  async getLeaderboard(
    limit = 10,
  ): Promise<{ userId: string; name: string; successfulReferrals: number }[]> {
    const codes = await this.codeRepo.find({
      order: { successfulReferrals: 'DESC' },
      take: Math.min(limit, 100),
    });

    if (codes.length === 0) return [];

    const userIds = codes.map((c) => c.userId);
    const users = await this.userRepo.findByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return codes.map((c) => {
      const user = userMap.get(c.userId);
      return {
        userId: c.userId,
        name: user?.fullName ?? user?.email ?? 'Unknown',
        successfulReferrals: c.successfulReferrals,
      };
    });
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
      const existing = await this.codeRepo.findOne({ where: { code } });
      if (!existing) return code;
    }
    throw new Error('Unable to generate unique referral code');
  }
}
