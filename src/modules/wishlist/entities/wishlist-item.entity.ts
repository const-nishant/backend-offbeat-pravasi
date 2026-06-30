import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WishlistCollection } from './wishlist-collection.entity';

@Entity({ name: 'wishlist_items' })
@Index(['collectionId', 'trekId'], { unique: true })
export class WishlistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  collectionId!: string;

  @Column({ type: 'uuid' })
  trekId!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  notes!: string | null;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'int', nullable: true })
  basePriceInr!: number | null;

  @ManyToOne(() => WishlistCollection, (col) => col.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collectionId' })
  collection!: WishlistCollection;

  @CreateDateColumn({ type: 'timestamptz' })
  addedAt!: Date;
}
