import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportReason {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  HARASSMENT = 'HARASSMENT',
  HATE_SPEECH = 'HATE_SPEECH',
  MISINFORMATION = 'MISINFORMATION',
  IMPERSONATION = 'IMPERSONATION',
  VIOLENCE = 'VIOLENCE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
  ACTION_TAKEN = 'ACTION_TAKEN',
}

export enum ReportTargetType {
  POST = 'POST',
  COMMENT = 'COMMENT',
  USER = 'USER',
  TREK = 'TREK',
  REVIEW = 'REVIEW',
  STORY = 'STORY',
}

@Entity({ name: 'reports' })
@Index(['status'])
@Index(['targetType', 'targetId'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  reporter!: User;

  @Column({ type: 'varchar', length: 20, enum: ReportTargetType })
  targetType!: ReportTargetType;

  @Column({ type: 'uuid' })
  targetId!: string;

  @Column({ type: 'varchar', length: 20, enum: ReportReason })
  reason!: ReportReason;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status!: ReportStatus;

  @ManyToOne(() => User, { nullable: true })
  reviewedBy?: User;

  @Column({ type: 'text', nullable: true })
  adminNotes?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;
}
