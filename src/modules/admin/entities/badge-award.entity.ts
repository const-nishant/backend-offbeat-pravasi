import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'badge_awards' })
@Index(['badgeId'])
@Index(['userId'])
@Index(['badgeId', 'userId'], { unique: true })
export class BadgeAward {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  badgeId!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar', length: 64, default: 'auto' })
  source!: string;

  @Column('uuid', { nullable: true })
  awardedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  awardedAt!: Date;
}
