import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'booking_policy_snapshots' })
export class BookingPolicySnapshot {
  @PrimaryColumn('uuid')
  bookingId: string;

  @Column({ type: 'varchar', length: 80 })
  policyName: string;

  @Column({ type: 'jsonb' })
  tiers: {
    fromHours: number;
    toHours?: number;
    refundPercentage: number;
    sortOrder: number;
  }[];

  @CreateDateColumn()
  createdAt: Date;
}
