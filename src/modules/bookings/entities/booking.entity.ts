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

export interface TrekSnapshot {
  name: string;
  location?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  difficulty?: string;
  durationDays?: number;
  maxAltitude?: number;
  [key: string]: unknown;
}

export interface Participant {
  fullName: string;
  email?: string;
  phone?: string;
  age?: number;
  [key: string]: unknown;
}

export interface BookingMetadata {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  specialRequirements?: string;
  ticketIssued?: boolean;
  ticketToken?: string;
  ticketIssuedAt?: string;
  paymentFailedAt?: string;
  refundReason?: string;
  refundedAt?: string;
  [key: string]: unknown;
}

@Entity({ name: 'bookings' })
@Index(['trekId', 'status'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  trekId!: string;

  @Column({ type: 'jsonb', nullable: false })
  trekSnapshot!: TrekSnapshot;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'jsonb', nullable: true })
  participants?: Participant[];

  @Column('int')
  quantity!: number;

  @Column('int')
  unitPriceInr!: number;

  @Column('int')
  totalAmountInr!: number;

  @Column({ type: 'varchar', length: 32, default: BookingStatus.PENDING })
  @Index()
  status!: BookingStatus;

  @Column('uuid', { nullable: true })
  paymentId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  holdExpiresAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: BookingMetadata;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
