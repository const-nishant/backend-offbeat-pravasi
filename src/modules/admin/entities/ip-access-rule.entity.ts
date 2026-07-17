import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum IpListType {
  BLOCKLIST = 'blocklist',
  ALLOWLIST = 'allowlist',
}

@Entity({ name: 'ip_access_rules' })
@Index(['listType', 'expiresAt'])
export class IpAccessRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: IpListType,
  })
  listType!: IpListType;

  @Column({ type: 'varchar', length: 45 })
  ipCidr!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  hitCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastHitAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
