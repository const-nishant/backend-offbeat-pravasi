import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrekGroup } from './trek-group.entity';
import { MemberStatus } from '../enums/member-status.enum';

@Entity({ name: 'group_members' })
@Index(['groupId', 'userId'], { unique: true })
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => TrekGroup, (tg) => tg.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group!: TrekGroup;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  email!: string;

  @Column({ type: 'varchar', length: 16, default: MemberStatus.INVITED })
  status!: MemberStatus;

  @Column({ type: 'varchar', length: 80, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  emergencyContact!: {
    name: string;
    phone: string;
    relationship: string;
  } | null;

  @Column({ type: 'text', nullable: true })
  medicalConditions!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  joinedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
