import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'duplicate_candidates' })
@Index(['entityType'])
@Index(['status'])
export class DuplicateCandidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 16 })
  entityType!: string;

  @Column('uuid')
  primaryId!: string;

  @Column('uuid')
  candidateId!: string;

  @Column({ type: 'float', default: 0 })
  similarityScore!: number;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
