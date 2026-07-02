import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';
import { CheckInStatus } from '../enums/check-in-status.enum';

@Entity({ name: 'trek_check_ins' })
@Index(['status', 'expectedCheckOutAt'])
export class TrekCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  bookingId!: string;

  @OneToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking!: Booking;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'timestamptz' })
  checkedInAt!: Date;

  @Column({ type: 'timestamptz' })
  expectedCheckOutAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  checkedOutAt!: Date | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: CheckInStatus.ACTIVE,
  })
  status!: CheckInStatus;

  @Column({ type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
