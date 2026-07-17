import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AlertSeverity {
  ADVISORY = 'ADVISORY',
  WATCH = 'WATCH',
  WARNING = 'WARNING',
}

@Entity({ name: 'weather_alerts' })
@Index(['severity'])
@Index(['createdAt'])
export class WeatherAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.ADVISORY,
  })
  severity!: AlertSeverity;

  @Column({ type: 'jsonb', nullable: true })
  affectedRegion?: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
