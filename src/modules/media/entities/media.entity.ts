import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MediaCategory {
  PROFILE = 'PROFILE',
  BANNER = 'BANNER',
  POST = 'POST',
  TREK = 'TREK',
  STORY = 'STORY',
}

@Entity({ name: 'media' })
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User;

  @Column({ type: 'varchar', length: 50 })
  bucket: string;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 50 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'enum', enum: MediaCategory })
  category: MediaCategory;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
