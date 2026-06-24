import { randomUUID } from 'node:crypto';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DevicePlatform } from '../enums/device-platform.enum';

@Entity({ name: 'device_tokens' })
@Index(['token', 'platform'], { unique: true })
@Index(['user'])
export class DeviceToken {
  @PrimaryColumn({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => User, (user) => user.deviceTokens, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar', length: 512 })
  token!: string;

  @Column({ type: 'enum', enum: DevicePlatform })
  platform!: DevicePlatform;

  @Column({ type: 'varchar', length: 20, nullable: true })
  appVersion?: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
