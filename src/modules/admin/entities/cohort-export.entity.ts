import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'cohort_exports' })
export class CohortExport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'jsonb' })
  filters!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 8, default: 'csv' })
  format!: string;

  @Column({ type: 'int', nullable: true })
  rowCount?: number | null;

  @Column({ type: 'text', nullable: true })
  fileUrl?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
