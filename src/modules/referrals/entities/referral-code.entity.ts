import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReferralTier } from '../enums/referral-tier.enum';

@Entity({ name: 'referral_codes' })
@Index(['code'], { unique: true })
@Index(['userId'], { unique: true })
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 16, default: ReferralTier.BASE })
  tier!: ReferralTier;

  @Column({ type: 'int', default: 0 })
  totalReferrals!: number;

  @Column({ type: 'int', default: 0 })
  successfulReferrals!: number;

  @Column({ type: 'int', default: 0 })
  totalEarnedInr!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
