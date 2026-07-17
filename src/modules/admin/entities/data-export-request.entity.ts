import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'data_export_requests' })
@Index(['userId'])
@Index(['status'])
export class DataExportRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: string;

  @Column('uuid', { nullable: true })
  reviewedBy?: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ type: 'text', nullable: true })
  fileUrl?: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSize?: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  downloadExpiresAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
