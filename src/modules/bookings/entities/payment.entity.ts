import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
}

export enum PaymentStatus {
  CREATED = 'CREATED',
  REQUIRES_ACTION = 'REQUIRES_ACTION',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  bookingId: string;

  @Column({ type: 'varchar', length: 32 })
  provider: PaymentProvider;

  @Column('varchar', { nullable: true })
  providerPaymentId?: string;

  @Column({ type: 'varchar', length: 32, default: PaymentStatus.CREATED })
  @Index()
  status: PaymentStatus;

  @Column('int')
  amountInr: number;

  @Column('varchar', { default: 'INR' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse?: any;

  @Column('varchar', { nullable: true })
  idempotencyKey?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
