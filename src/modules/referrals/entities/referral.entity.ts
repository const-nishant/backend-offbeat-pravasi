import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReferralStatus } from '../enums/referral-status.enum';
import { RewardType } from '../enums/reward-type.enum';

@Entity({ name: 'referrals' })
@Index(['referrerCodeId', 'refereeEmail'], { unique: true })
@Index(['refereeUserId'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  referrerCodeId!: string;

  @Column({ type: 'uuid', nullable: true })
  refereeUserId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  refereeEmail!: string;

  @Column({ type: 'varchar', length: 16, default: ReferralStatus.PENDING })
  status!: ReferralStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  rewardType!: RewardType | null;

  @Column({ type: 'int', nullable: true })
  rewardValueInr!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  rewardDeliveredAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
