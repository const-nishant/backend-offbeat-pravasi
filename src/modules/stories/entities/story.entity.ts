import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { StoryView } from './story-view.entity';

@Entity({ name: 'stories' })
@Index(['user'])
@Index(['expiresAt'])
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'varchar' })
  mediaUrl!: string;

  @Column({ type: 'varchar', length: 20 })
  mediaType!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  caption?: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  viewsCount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => StoryView, (view) => view.story)
  views?: StoryView[];
}
