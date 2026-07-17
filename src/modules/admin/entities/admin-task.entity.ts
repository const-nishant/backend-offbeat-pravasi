import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity({ name: 'admin_tasks' })
@Index(['assignedTo'])
@Index(['status'])
@Index(['type'])
export class AdminTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  type!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  resourceType?: string | null;

  @Column('uuid', { nullable: true })
  resourceId?: string | null;

  @Column('uuid', { nullable: true })
  assignedTo?: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: TaskStatus.OPEN,
  })
  status!: TaskStatus;

  @Column({
    type: 'varchar',
    length: 16,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: 'timestamptz', nullable: true })
  dueBy?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
