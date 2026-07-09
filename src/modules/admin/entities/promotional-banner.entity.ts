import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BannerPlacement = 'homepage' | 'trek-page' | 'checkout';

@Entity({ name: 'promotional_banners' })
@Index(['placement', 'isActive'])
@Index(['startDate', 'endDate'])
export class PromotionalBanner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 400, nullable: true })
  subtitle?: string | null;

  @Column({ type: 'text' })
  imageUrl!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ctaText?: string | null;

  @Column({ type: 'text', nullable: true })
  ctaLink?: string | null;

  @Column({ type: 'varchar', length: 32, default: 'homepage' })
  placement!: BannerPlacement;

  @Column({ type: 'timestamptz' })
  startDate!: Date;

  @Column({ type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  impressions!: number;

  @Column({ type: 'int', default: 0 })
  clicks!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
