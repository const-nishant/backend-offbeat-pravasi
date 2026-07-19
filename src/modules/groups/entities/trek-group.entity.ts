import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GroupMember } from './group-member.entity';
import { GroupStatus } from '../enums/group-status.enum';

@Entity({ name: 'trek_groups' })
@Index(['shareCode'], { unique: true })
@Index(['trekId', 'status'])
export class TrekGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  trekId!: string;

  @Column({ type: 'uuid' })
  leadUserId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'int' })
  maxSize!: number;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 16, default: GroupStatus.OPEN })
  status!: GroupStatus;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  moderationStatus!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  banReason?: string | null;

  @Column({ type: 'varchar', length: 12, unique: true })
  shareCode!: string;

  @OneToMany(() => GroupMember, (gm) => gm.group)
  members?: GroupMember[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
