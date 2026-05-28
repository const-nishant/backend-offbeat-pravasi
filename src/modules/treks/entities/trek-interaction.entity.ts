import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Trek } from './trek.entity';

export enum InteractionType {
  VIEW = 'VIEW',
  BOOKMARK = 'BOOKMARK',
  BOOKING = 'BOOKING',
  LIKE = 'LIKE',
}

@Entity({ name: 'trek_interactions' })
export class TrekInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trek, { nullable: false, onDelete: 'CASCADE' })
  trek!: Trek;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column({ type: 'enum', enum: InteractionType })
  type!: InteractionType;

  @Column({ type: 'int', default: 1 })
  weight!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
