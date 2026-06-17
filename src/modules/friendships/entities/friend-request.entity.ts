import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FriendRequestStatus } from '../enums/friend-request-status.enum';

@Entity({ name: 'friend_requests' })
@Index(['receiver', 'status'])
export class FriendRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'CASCADE' })
  sender!: User;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'CASCADE' })
  receiver!: User;

  @Column({
    type: 'enum',
    enum: FriendRequestStatus,
    default: FriendRequestStatus.PENDING,
  })
  status!: FriendRequestStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
