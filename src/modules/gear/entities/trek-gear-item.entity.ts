import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Trek } from '../../treks/entities/trek.entity';
import { GearItem } from './gear-item.entity';
import { RequirementType } from '../enums/requirement-type.enum';

@Entity({ name: 'trek_gear_items' })
@Unique(['trekId', 'gearItemId'])
export class TrekGearItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  trekId: string;

  @ManyToOne(() => Trek, (trek) => trek.gearItems, { onDelete: 'CASCADE' })
  @JoinColumn()
  trek: Trek;

  @Column('uuid')
  gearItemId: string;

  @ManyToOne(() => GearItem, { onDelete: 'CASCADE' })
  @JoinColumn()
  gearItem: GearItem;

  @Column({ type: 'varchar', length: 16 })
  requirementType: RequirementType;

  @Column({ type: 'int', nullable: true })
  rentalPriceInr?: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  notes?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
