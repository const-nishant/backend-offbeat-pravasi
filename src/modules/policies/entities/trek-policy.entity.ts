import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CancellationPolicy } from './cancellation-policy.entity';

@Entity({ name: 'trek_policies' })
export class TrekPolicy {
  @PrimaryColumn('uuid')
  trekId: string;

  @Column('uuid')
  policyId: string;

  @ManyToOne(() => CancellationPolicy)
  @JoinColumn({ name: 'policyId' })
  policy: CancellationPolicy;
}
