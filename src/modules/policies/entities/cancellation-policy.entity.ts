import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CancellationTier } from './cancellation-tier.entity';

@Entity({ name: 'cancellation_policies' })
export class CancellationPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @OneToMany(() => CancellationTier, (tier) => tier.policy, {
    cascade: true,
    eager: true,
  })
  tiers: CancellationTier[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
