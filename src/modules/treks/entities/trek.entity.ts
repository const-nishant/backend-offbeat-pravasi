import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TrekImage } from './trek-image.entity';
import { TrekTag } from './trek-tag.entity';
import { TrekReview } from './trek-review.entity';
import { TrekDifficulty } from '../enums/trek-difficulty.enum';

@Entity({ name: 'treks' })
@Index(['state'])
@Index(['difficulty'])
export class Trek {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true })
  organizer!: User | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  slug!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  shortDescription!: string | null;

  @Column({ type: 'text', nullable: true })
  fullDescription!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  // PostGIS geometry column (Point, 4326). Created by migration.
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startDate!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'enum', enum: TrekDifficulty, nullable: true })
  difficulty!: TrekDifficulty | null;

  @Column({ type: 'int', default: 0 })
  costInr!: number;

  @Column({ type: 'int', default: 1 })
  maxParticipants!: number;

  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ type: 'float', default: 0 })
  avgRating!: number;

  @Column({ type: 'int', default: 0 })
  ratingCount!: number;

  @Column({ type: 'bigint', default: 0 })
  popularityScore!: number;

  @ManyToMany(() => TrekTag, (tag) => tag.treks, { cascade: true })
  @JoinTable({ name: 'trek_tags_link' })
  tags!: TrekTag[];

  @OneToMany(() => TrekImage, (img) => img.trek)
  images!: TrekImage[];

  @OneToMany(() => TrekReview, (r) => r.trek)
  reviews!: TrekReview[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
