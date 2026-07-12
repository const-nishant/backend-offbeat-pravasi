import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

type DiscountType = 'PERCENTAGE' | 'FLAT';

@Entity({ name: 'pricing_campaigns' })
@Index(['startDate', 'endDate'])
@Index(['isActive'])
export class PricingCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column('uuid', { array: true })
  trekIds!: string[];

  @Column({ type: 'varchar', length: 16 })
  discountType!: DiscountType;

  @Column('int')
  discountValue!: number;

  @Column('int', { nullable: true })
  maxCap?: number | null;

  @Column('int', { nullable: true })
  minBookingAmount?: number | null;

  @Column({ type: 'timestamptz' })
  startDate!: Date;

  @Column({ type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
