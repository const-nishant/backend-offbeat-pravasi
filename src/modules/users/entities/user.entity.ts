import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender } from '../enums/gender.enum';
import { OrganizerStatus } from '../enums/organizer-status.enums';
import { AdminRole } from '../enums/admin-role.enum';
import { DeviceToken } from '../../notifications/entities/device-token.entity';
import { Notification as NotificationEntity } from '../../notifications/entities/notification.entity';

@Entity({ name: 'users' })
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true })
  location!: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  profileImageUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerImageUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  @Column({
    type: 'enum',
    enum: AdminRole,
    nullable: true,
    default: null,
  })
  role!: AdminRole | null;

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

  // Average rating for the user as an organizer (0-5), default 0
  @Column({ type: 'float', default: 0 })
  organizerRating!: number;

  // Whether the user is currently active as an organizer
  @Column({ type: 'boolean', default: false })
  isOrganizerActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isSuspended!: boolean;

  @OneToMany(() => DeviceToken, (dt) => dt.user)
  deviceTokens?: DeviceToken[];

  @OneToMany(() => NotificationEntity, (n) => n.user)
  notifications?: NotificationEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
