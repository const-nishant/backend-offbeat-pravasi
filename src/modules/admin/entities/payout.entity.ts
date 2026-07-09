import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
}

@Entity({ name: 'payouts' })
@Index(['organizerId'])
@Index(['status'])
@Index(['periodStart', 'periodEnd'])
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  organizerId!: string;

  @Column('int')
  amount!: number;

  @Column('int', { default: 0 })
  platformFee!: number;

  @Column('int')
  netAmount!: number;

  @Column({
    type: 'varchar',
    length: 16,
    default: PayoutStatus.PENDING,
  })
  status!: PayoutStatus;

  @Column({ type: 'timestamptz' })
  periodStart!: Date;

  @Column({ type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
