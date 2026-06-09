import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
@Index(['actorId'])
@Index(['action'])
@Index(['resourceType', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actorEmail?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  actorRole?: string | null;

  @Column({ type: 'varchar', length: 128 })
  action!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detail?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
