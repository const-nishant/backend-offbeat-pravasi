import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Trek } from '../../treks/entities/trek.entity';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { ActivityType } from '../enums/activity-type.enum';

@Entity({ name: 'itinerary_days' })
@Unique(['trekId', 'dayNumber'])
export class ItineraryDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  trekId!: string;

  @ManyToOne(() => Trek, (trek) => trek.itineraryDays, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trekId' })
  trek!: Trek;

  @Column({ type: 'int' })
  dayNumber!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'double precision', nullable: true })
  distanceKm!: number | null;

  @Column({ type: 'int', nullable: true })
  altitudeGainM!: number | null;

  @Column({ type: 'int', nullable: true })
  altitudeLossM!: number | null;

  @Column({ type: 'int', nullable: true })
  maxAltitudeM!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  mealPlan!: { breakfast?: string; lunch?: string; dinner?: string } | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  accommodationType!: AccommodationType | null;

  @Column({ type: 'varchar', length: 32 })
  activityType!: ActivityType;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
