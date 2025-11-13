import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OrganizerStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'users' })
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  email!: string;

  @Column({ select: false, nullable: true })
  passwordHash!: string | null;

  @Column({ length: 80, nullable: true })
  fullName!: string | null;

  @Column({ length: 80, nullable: true })
  username!: string | null;

  @Column({ nullable: true })
  phone!: string | null;

  @Column({ nullable: true })
  location!: string | null;

  @Column({ nullable: true })
  gender!: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ nullable: true })
  profileImageUrl!: string | null;

  @Column({ nullable: true })
  bannerImageUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  @Column({
    type: 'enum',
    enum: OrganizerStatus,
    default: OrganizerStatus.NONE,
  })
  organizerStatus!: OrganizerStatus;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'float', default: 0 })
  userPoints!: number;

  @Column({ type: 'int', default: 0 })
  userDistanceTravelled!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
