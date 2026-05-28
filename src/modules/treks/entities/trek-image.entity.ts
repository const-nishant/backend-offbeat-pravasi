import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Trek } from './trek.entity';

@Entity({ name: 'trek_images' })
export class TrekImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Trek, (t) => t.images, { onDelete: 'CASCADE' })
  trek!: Trek;

  @Column({ type: 'varchar', length: 512 })
  key!: string; // R2 key or path

  @Column({ type: 'varchar', length: 1024, nullable: true })
  url!: string | null;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
