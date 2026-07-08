import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'failed_login_attempts' })
@Index(['ip'])
@Index(['userId'])
@Index(['createdAt'])
export class FailedLoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 45 })
  ip!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
