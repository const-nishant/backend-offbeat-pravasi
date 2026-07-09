import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'coupon_redemptions' })
@Index(['couponId'])
@Index(['bookingId'])
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  couponId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  bookingId!: string;

  @Column({ type: 'int' })
  discountAmount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
