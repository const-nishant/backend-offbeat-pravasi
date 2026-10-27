import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Trek } from './trek.entity';

@Entity({ name: 'trek_reviews' })
export class TrekReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trek, (t) => t.reviews, { onDelete: 'CASCADE' })
  trek!: Trek;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
