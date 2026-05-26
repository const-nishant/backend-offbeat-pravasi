import { User } from 'src/modules/users/entities/user.entity';
import { OrganizerStatus } from 'src/modules/users/enums/organizer-status.enums';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'organizer_applications' })
export class OrganizerApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @Column({ length: 160 })
  organizationName: string;

  @Column({ length: 160, nullable: true })
  contactPerson?: string;

  @Column({ length: 20 })
  contactPhone: string;

  @Column({ length: 160, nullable: true })
  website?: string;

  @Column({ type: 'text' })
  bio: string;

  @Column({ type: 'int', nullable: true })
  yearsOfExperience?: number;

  @Column({ type: 'jsonb', nullable: true })
  documentUrls?: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  certificateUrls?: Record<string, string>;

  @Column({
    type: 'enum',
    enum: OrganizerStatus,
    default: OrganizerStatus.PENDING,
  })
  status: OrganizerStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes?: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;
}
