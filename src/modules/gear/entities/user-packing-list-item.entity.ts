import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TrekGearItem } from './trek-gear-item.entity';

@Entity({ name: 'user_packing_list_items' })
@Unique(['userId', 'trekGearItemId'])
export class UserPackingListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  trekGearItemId: string;

  @ManyToOne(() => TrekGearItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trekGearItemId' })
  trekGearItem: TrekGearItem;

  @Column({ type: 'boolean', default: false })
  hasItem: boolean;

  @Column({ type: 'boolean', default: false })
  needsRental: boolean;

  @Column({ type: 'boolean', default: false })
  checked: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
