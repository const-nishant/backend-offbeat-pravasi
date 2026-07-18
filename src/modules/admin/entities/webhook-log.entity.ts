import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookStatus {
  PROCESSED = 'processed',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity({ name: 'webhook_logs' })
@Index(['provider', 'createdAt'])
@Index(['status'])
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  provider: string;

  @Column({ length: 100 })
  eventType: string;

  @Column({ length: 20, default: WebhookStatus.PROCESSED })
  status: string;

  @Column({ nullable: true })
  statusCode?: number;

  @Column({ type: 'text', nullable: true })
  requestBody?: string;

  @Column({ type: 'text', nullable: true })
  responseBody?: string;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ nullable: true })
  durationMs?: number;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRetryAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
