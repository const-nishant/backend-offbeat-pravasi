import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'email_templates' })
@Index(['name'], { unique: true })
@Index(['isActive'])
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  bodyHtml!: string;

  @Column({ type: 'jsonb', nullable: true })
  variables?: string[] | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'jsonb', nullable: true })
  versionHistory?: Array<{
    subject: string;
    bodyHtml: string;
    variables: string[] | null;
    version: number;
    updatedAt: string;
  }> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
