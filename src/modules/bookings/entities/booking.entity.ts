import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

@Entity({ name: 'bookings' })
@Index(['trekId', 'status'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  trekId: string;

  @Column({ type: 'jsonb', nullable: false })
  trekSnapshot: any;

  @Column('uuid')
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  participants?: any[];

  @Column('int')
  quantity: number;

  @Column('int')
  unitPriceInr: number;

  @Column('int')
  totalAmountInr: number;

  @Column({ type: 'varchar', length: 32, default: BookingStatus.PENDING })
  @Index()
  status: BookingStatus;

  @Column('uuid', { nullable: true })
  paymentId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  holdExpiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
