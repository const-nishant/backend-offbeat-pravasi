import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Trek } from '../../treks/entities/trek.entity';

@Entity({ name: 'bookmarks' })
@Unique(['user', 'trek'])
export class Bookmark {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Trek, { nullable: false, onDelete: 'CASCADE' })
  @Index()
  trek!: Trek;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
