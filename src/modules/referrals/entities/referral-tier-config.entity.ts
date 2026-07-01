import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ReferralTier } from '../enums/referral-tier.enum';

@Entity({ name: 'referral_tier_config' })
export class ReferralTierConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16, unique: true })
  tier!: ReferralTier;

  @Column({ type: 'int' })
  minSuccessfulReferrals!: number;

  @Column({ type: 'int' })
  rewardPerReferralInr!: number;

  @Column({ type: 'int' })
  refereeDiscountInr!: number;
}
