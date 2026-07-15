import {
  DataSource,
  Repository,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
  OneToMany,
} from 'typeorm';
import { GearService } from '../gear.service';
import { RequirementType } from '../enums/requirement-type.enum';
import {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
  beforeEach,
} from '@jest/globals';

// --- SQLite-compatible entities ---

@Entity({ name: 'gear_items' })
class SqliteGearItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'varchar', length: 32 }) category!: string;
  @Column({ type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'trek_gear_items' })
@Unique(['trekId', 'gearItemId'])
class SqliteTrekGearItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') trekId!: string;
  @Column('uuid') gearItemId!: string;
  @ManyToOne(() => SqliteGearItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gearItemId' })
  gearItem!: SqliteGearItem;
  @Column({ type: 'varchar', length: 16 }) requirementType!: string;
  @Column({ type: 'int', nullable: true }) rentalPriceInr?: number;
  @Column({ type: 'varchar', length: 512, nullable: true }) notes?: string;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
}

@Entity({ name: 'user_packing_list_items' })
@Unique(['userId', 'trekGearItemId'])
class SqliteUserPackingListItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') userId!: string;
  @Column('uuid') trekGearItemId!: string;
  @ManyToOne(() => SqliteTrekGearItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trekGearItemId' })
  trekGearItem!: SqliteTrekGearItem;
  @Column({ type: 'boolean', default: false }) hasItem!: boolean;
  @Column({ type: 'boolean', default: false }) needsRental!: boolean;
  @Column({ type: 'boolean', default: false }) checked!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) fullName?: string;
  @Column({ type: 'varchar', nullable: true }) role!: string | null;
}

@Entity({ name: 'treks' })
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid', { nullable: true }) organizerId?: string;
  @ManyToOne(() => SqliteUser, { nullable: true })
  @JoinColumn({ name: 'organizerId' })
  organizer?: SqliteUser;
  @Column({ type: 'varchar', length: 255 }) name!: string;
}

@Entity({ name: 'bookings' })
class SqliteBooking {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') trekId!: string;
  @Column('uuid') userId!: string;
  @Column({ type: 'varchar', length: 32, default: 'PENDING' }) status!: string;
  @Column({ type: 'int', default: 0 }) totalAmountInr!: number;
  @Column({ type: 'text', nullable: true }) metadata?: string;
}

describe('GearService Integration (SQLite)', () => {
  let dataSource: DataSource;
  let gearItemRepo: Repository<SqliteGearItem>;
  let trekGearRepo: Repository<SqliteTrekGearItem>;
  let packingListRepo: Repository<SqliteUserPackingListItem>;
  let trekRepo: Repository<SqliteTrek>;
  let bookingRepo: Repository<SqliteBooking>;
  let service: GearService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [
        SqliteGearItem,
        SqliteTrekGearItem,
        SqliteUserPackingListItem,
        SqliteUser,
        SqliteTrek,
        SqliteBooking,
      ],
      synchronize: true,
    });
    await dataSource.initialize();

    gearItemRepo = dataSource.getRepository(SqliteGearItem);
    trekGearRepo = dataSource.getRepository(SqliteTrekGearItem);
    packingListRepo = dataSource.getRepository(SqliteUserPackingListItem);
    trekRepo = dataSource.getRepository(SqliteTrek);
    bookingRepo = dataSource.getRepository(SqliteBooking);

    service = new GearService(
      gearItemRepo as any,
      trekGearRepo as any,
      packingListRepo as any,
      trekRepo as any,
      bookingRepo as any,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM user_packing_list_items');
    await dataSource.query('DELETE FROM trek_gear_items');
    await dataSource.query('DELETE FROM gear_items');
    await dataSource.query('DELETE FROM bookings');
    await dataSource.query('DELETE FROM treks');
    await dataSource.query('DELETE FROM users');
  });

  test('should create and retrieve gear items', async () => {
    const created = await service.createGearItem({
      name: 'Trekking Shoes',
      category: 'FOOTWEAR' as any,
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Trekking Shoes');

    const all = await service.getAllGearItems();
    expect(all).toHaveLength(1);
  });

  test('should set and retrieve trek gear', async () => {
    const orgUser = await dataSource.getRepository(SqliteUser).save({
      id: 'org-1',
      fullName: 'Organizer',
    });
    const trek = await trekRepo.save({
      id: 'trek-1',
      name: 'Test Trek',
      organizer: orgUser,
    });
    const item = await service.createGearItem({
      name: 'Sleeping Bag',
      category: 'CAMPING' as any,
    });

    const result = await service.setTrekGear(trek.id, 'org-1', {
      items: [
        {
          gearItemId: item.id,
          requirementType: RequirementType.REQUIRED,
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].trekId).toBe(trek.id);

    const trekGear = await service.getTrekGear(trek.id);
    expect(trekGear).toHaveLength(1);
  });

  test('should create packing list from trek gear', async () => {
    const orgUser = await dataSource.getRepository(SqliteUser).save({
      id: 'org-1',
      fullName: 'Organizer',
    });
    await trekRepo.save({
      id: 'trek-1',
      name: 'Test Trek',
      organizer: orgUser,
    });
    await bookingRepo.save({
      id: 'booking-1',
      trekId: 'trek-1',
      userId: 'user-1',
      status: 'PENDING',
      totalAmountInr: 0,
    });

    const item = await service.createGearItem({
      name: 'Trekking Poles',
      category: 'CAMPING' as any,
    });

    await service.setTrekGear('trek-1', 'org-1', {
      items: [
        {
          gearItemId: item.id,
          requirementType: RequirementType.RECOMMENDED,
        },
      ],
    });

    const packingList = await service.getPackingList('booking-1', 'user-1');
    expect(packingList).toHaveLength(1);
    expect(packingList[0].hasItem).toBe(false);
  });

  test('should confirm rentals and calculate cost', async () => {
    const orgUser = await dataSource.getRepository(SqliteUser).save({
      id: 'org-1',
      fullName: 'Organizer',
    });
    await trekRepo.save({
      id: 'trek-1',
      name: 'Test Trek',
      organizer: orgUser,
    });
    await bookingRepo.save({
      id: 'booking-1',
      trekId: 'trek-1',
      userId: 'user-1',
      status: 'PENDING',
      totalAmountInr: 5000,
    });

    const item = await service.createGearItem({
      name: 'Sleeping Bag',
      category: 'CAMPING' as any,
    });

    await service.setTrekGear('trek-1', 'org-1', {
      items: [
        {
          gearItemId: item.id,
          requirementType: RequirementType.RENTAL,
          rentalPriceInr: 1000,
        },
      ],
    });

    const packingList = await service.getPackingList('booking-1', 'user-1');
    const pli = packingList[0];

    const updated = await service.updatePackingItem(
      'booking-1',
      pli.id,
      'user-1',
      {
        needsRental: true,
      },
    );
    expect(updated.needsRental).toBe(true);

    const result = await service.confirmRentals('booking-1', 'user-1');
    expect(result.addedCost).toBe(1000);
  });
});
