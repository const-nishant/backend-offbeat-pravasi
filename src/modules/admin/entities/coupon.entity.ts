import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

@Entity({ name: 'coupons' })
@Index(['code'], { unique: true })
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 60 })
  code!: string;

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
  })
  discountType!: DiscountType;

  @Column({ type: 'int' })
  discountValue!: number;

  @Column({ type: 'int', nullable: true })
  maxDiscountCap?: number | null;

  @Column({ type: 'int', default: 0 })
  minBookingAmount!: number;

  @Column({ type: 'int', nullable: true })
  maxUses?: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount!: number;

  @Column({ type: 'uuid', array: true, default: [] })
  applicableTrekIds!: string[];

  @Column({ type: 'timestamptz', nullable: true })
  validFrom?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  validTo?: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
