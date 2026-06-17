import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Story } from './story.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'story_views' })
@Index(['story', 'user'], { unique: true })
export class StoryView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Story, { nullable: false, onDelete: 'CASCADE' })
  story!: Story;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  viewedAt!: Date;
}
