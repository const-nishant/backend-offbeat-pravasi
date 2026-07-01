import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'recommendation_events' })
@Index(['userId', 'eventType', 'createdAt'])
@Index(['trekId', 'eventType'])
export class RecommendationEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  recommendationResultId!: string | null;

  @Column({ type: 'uuid' })
  trekId!: string;

  @Column({ type: 'varchar', length: 32 })
  eventType!: string;

  @Column({ type: 'float', nullable: true })
  score!: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
