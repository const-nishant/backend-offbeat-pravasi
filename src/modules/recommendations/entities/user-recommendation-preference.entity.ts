import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_recommendation_preferences' })
@Index(['userId'], { unique: true })
export class UserRecommendationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', array: true, nullable: true })
  preferredDifficulty!: string[] | null;

  @Column({ type: 'varchar', array: true, length: 80, nullable: true })
  preferredStates!: string[] | null;

  @Column({ type: 'int', nullable: true })
  maxBudget!: number | null;

  @Column({ type: 'int', array: true, nullable: true })
  preferredDurationDays!: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  interests!: Record<string, unknown> | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
