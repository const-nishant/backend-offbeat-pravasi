import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Trek } from './trek.entity';

@Entity({ name: 'trek_tags' })
export class TrekTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @ManyToMany(() => Trek, (t) => t.tags)
  treks!: Trek[];
}
