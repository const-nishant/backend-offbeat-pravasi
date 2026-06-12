import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'leaderboard_entries' })
@Index(['userId'])
@Index(['score', 'updatedAt'])
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column({ type: 'float', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 0 })
  rank!: number;

  @Column({ type: 'varchar', length: 20, default: 'global' })
  boardType!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
