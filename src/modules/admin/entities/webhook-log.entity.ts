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

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ length: 20, default: WebhookStatus.PROCESSED })
  status: string;

  @Column({ name: 'status_code', nullable: true })
  statusCode?: number;

  @Column({ name: 'request_body', type: 'text', nullable: true })
  requestBody?: string;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody?: string;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs?: number;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'last_retry_at', type: 'timestamptz', nullable: true })
  lastRetryAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
