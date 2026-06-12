import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';
import { PostLike } from './post-like.entity';

@Entity({ name: 'posts' })
@Index(['user', 'createdAt'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'text' })
  caption!: string;

  @Column({ type: 'simple-array' })
  imageUrls!: string[];

  @Column({ type: 'varchar', nullable: true })
  location?: string;

  @Column({ type: 'int', default: 0 })
  likesCount!: number;

  @Column({ type: 'int', default: 0 })
  commentsCount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments?: Comment[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes?: PostLike[];
}
