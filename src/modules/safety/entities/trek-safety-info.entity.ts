import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Trek } from '../../treks/entities/trek.entity';

@Entity({ name: 'trek_safety_info' })
export class TrekSafetyInfo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  trekId!: string;

  @OneToOne(() => Trek, { onDelete: 'CASCADE' })
  @JoinColumn()
  trek!: Trek;

  @Column({ type: 'text', nullable: true })
  terrainRisks!: string | null;

  @Column({ type: 'text', nullable: true })
  altitudeWarnings!: string | null;

  @Column({ type: 'text', nullable: true })
  wildlifeAdvisories!: string | null;

  @Column({ type: 'text', nullable: true })
  generalGuidelines!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  baseCampContact!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  localRescueContact!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nearestHospital!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
