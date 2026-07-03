import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'analytics_events' })
@Index(['userId', 'createdAt'])
@Index(['event', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  event!: string;

  @Column({ type: 'jsonb', nullable: true })
  properties?: any;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
