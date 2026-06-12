import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'platform_settings' })
export class PlatformSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128, default: 'platform_settings' })
  key!: string;

  @Column({ type: 'jsonb', nullable: false })
  settings!: any;

  @Column({ type: 'uuid', nullable: true })
  changedBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  changedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
