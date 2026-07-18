import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CancellationPolicy } from './cancellation-policy.entity';

@Entity({ name: 'cancellation_tiers' })
@Index(['policyId', 'sortOrder'])
export class CancellationTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  policyId: string;

  @ManyToOne(() => CancellationPolicy, (policy) => policy.tiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  policy: CancellationPolicy;

  @Column('int')
  fromHoursBeforeStart: number;

  @Column('int', { nullable: true })
  toHoursBeforeStart?: number;

  @Column('int')
  refundPercentage: number;

  @Column('int')
  sortOrder: number;
}
