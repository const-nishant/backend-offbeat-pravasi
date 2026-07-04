import { randomUUID } from 'node:crypto';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignStatus } from '../enums/campaign-status.enum';

@Entity({ name: 'notification_campaigns' })
export class NotificationCampaign {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  deepLink?: string;

  @Column({ type: 'jsonb' })
  segmentConfig!: Record<string, unknown>;

  @Column({
    type: 'simple-enum',
    enum: CampaignStatus,
    default: CampaignStatus.PENDING,
  })
  status!: CampaignStatus;

  @Column({ type: 'int', nullable: true })
  totalUsers?: number;

  @Column({ type: 'int', nullable: true })
  totalBatches?: number;

  @Column({ type: 'int', nullable: true })
  completedBatches?: number;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  createdBy?: User;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
