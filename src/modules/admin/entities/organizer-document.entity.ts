import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'organizer_documents' })
@Index(['organizerId'])
@Index(['status'])
@Index(['expiresAt'])
export class OrganizerDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  organizerId!: string;

  @Column({ type: 'varchar', length: 32 })
  documentType!: string;

  @Column({ type: 'text' })
  fileUrl!: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: string;

  @Column('uuid', { nullable: true })
  verifiedBy?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
