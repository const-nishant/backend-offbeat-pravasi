import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'admin_notification_preferences' })
@Index(['adminId', 'eventType'], { unique: true })
export class AdminNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  adminId!: string;

  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ type: 'varchar', length: 16 })
  channel!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
