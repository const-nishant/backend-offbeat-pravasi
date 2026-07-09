import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'itinerary_template_days' })
@Index(['templateId'])
export class ItineraryTemplateDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  templateId!: string;

  @Column({ type: 'int' })
  dayNumber!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  activities?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accommodation?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  meals?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
