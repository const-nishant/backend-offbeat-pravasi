import { randomUUID } from 'node:crypto';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../enums/notification-type.enum';

@Entity({ name: 'notifications' })
@Index(['user', 'readAt'])
@Index(['user', 'createdAt'])
export class Notification {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
