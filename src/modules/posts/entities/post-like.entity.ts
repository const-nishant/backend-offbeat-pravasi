import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'post_likes' })
@Index(['post', 'user'], { unique: true })
export class PostLike {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Post, { nullable: false, onDelete: 'CASCADE' })
  post!: Post;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
