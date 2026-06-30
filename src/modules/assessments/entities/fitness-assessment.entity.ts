import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'fitness_assessments' })
@Index(['userId', 'completedAt'])
export class FitnessAssessment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'int' })
  totalScore!: number;

  @Column({ type: 'varchar', length: 16 })
  difficultyBracket!: string;

  @Column({ type: 'jsonb' })
  answers!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  completedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
