import {
  DataSource,
  Repository,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ItinerariesService } from './itineraries.service';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { ActivityType } from './enums/activity-type.enum';
import { AccommodationType } from './enums/accommodation-type.enum';

/* ---------- SQLite-compatible entity definitions ---------- */

@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120 }) email!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) passwordHash!:
    | string
    | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) fullName!:
    | string
    | null;
  @Column({ type: 'boolean', default: false }) isAdmin!: boolean;
  @Column({ type: 'varchar', default: 'NONE' }) organizerStatus!: string;
  @Column({ type: 'boolean', default: false }) isOrganizerActive!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'treks' })
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteUser, { nullable: true })
  organizer!: SqliteUser | null;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'int', default: 0 }) costInr!: number;
  @Column({ type: 'int', default: 1 }) maxParticipants!: number;
  @Column({ type: 'boolean', default: false }) isPublished!: boolean;
  @Column({ type: 'int', default: 0 }) currentParticipants!: number;
  @Column({ type: 'varchar', length: 32, default: 'DRAFT' }) status!: string;
  @OneToMany(() => SqliteItineraryDay, (d: any) => d.trek)
  itineraryDays!: SqliteItineraryDay[];
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'itinerary_days' })
@Unique(['trekId', 'dayNumber'])
class SqliteItineraryDay {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' })
  @Index()
  trekId!: string;
  @ManyToOne(() => SqliteTrek, (t: any) => t.itineraryDays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trekId' })
  trek!: SqliteTrek;
  @Column({ type: 'int' }) dayNumber!: number;
  @Column({ type: 'varchar', length: 255 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'float', nullable: true }) distanceKm!: number | null;
  @Column({ type: 'int', nullable: true }) altitudeGainM!: number | null;
  @Column({ type: 'int', nullable: true }) altitudeLossM!: number | null;
  @Column({ type: 'int', nullable: true }) maxAltitudeM!: number | null;
  @Column({ type: 'simple-json', nullable: true }) mealPlan!: object | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) accommodationType!:
    | string
    | null;
  @Column({ type: 'varchar', length: 32 }) activityType!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

/* ---------- Tests ---------- */

describe('ItinerariesService Integration (sqlite)', () => {
  let dataSource: DataSource;
  let service: ItinerariesService;
  let trekRepo: Repository<SqliteTrek>;
  let userRepo: Repository<SqliteUser>;
  let itineraryRepo: Repository<SqliteItineraryDay>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [SqliteUser, SqliteTrek, SqliteItineraryDay],
    });
    await dataSource.initialize();

    trekRepo = dataSource.getRepository(SqliteTrek);
    userRepo = dataSource.getRepository(SqliteUser);
    itineraryRepo = dataSource.getRepository(SqliteItineraryDay);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    service = new ItinerariesService(itineraryRepo as any, trekRepo as any);
  });

  /* ---------- Helpers ---------- */

  async function createOrganizer(): Promise<SqliteUser> {
    const user = userRepo.create({
      email: 'org@test.com',
      passwordHash: 'hash',
      organizerStatus: 'APPROVED',
      isOrganizerActive: true,
    });
    return userRepo.save(user);
  }

  async function createTrek(organizer: SqliteUser): Promise<SqliteTrek> {
    const trek = trekRepo.create({
      name: 'Test Trek',
      organizer,
      costInr: 1500,
      maxParticipants: 20,
    } as any);
    return trekRepo.save(trek);
  }

  async function createOtherUser(): Promise<SqliteUser> {
    const user = userRepo.create({
      email: 'other@test.com',
      passwordHash: 'hash',
      organizerStatus: 'APPROVED',
      isOrganizerActive: true,
    });
    return userRepo.save(user);
  }

  /* ---------- Tests ---------- */

  describe('getByTrek', () => {
    it('returns days for a trek in ascending order', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      const day1 = itineraryRepo.create({
        trekId: trek.id,
        dayNumber: 2,
        title: 'Second Day',
        activityType: ActivityType.TREKKING,
      });
      const day2 = itineraryRepo.create({
        trekId: trek.id,
        dayNumber: 1,
        title: 'First Day',
        activityType: ActivityType.REST,
      });
      await itineraryRepo.save([day1, day2]);

      const result = await service.getByTrek(trek.id);

      expect(result).toHaveLength(2);
      expect(result[0].dayNumber).toBe(1);
      expect(result[0].title).toBe('First Day');
      expect(result[1].dayNumber).toBe(2);
      expect(result[1].title).toBe('Second Day');
    });

    it('returns empty array when no days exist', async () => {
      const result = await service.getByTrek('non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('addDay', () => {
    it('adds a day when user is the trek organizer', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      const dto = {
        dayNumber: 1,
        title: 'Summit Attempt',
        activityType: ActivityType.TREKKING as any,
        distanceKm: 8.5,
        altitudeGainM: 1200,
        accommodationType: AccommodationType.CAMP as any,
        mealPlan: { breakfast: 'Pancakes', lunch: 'Sandwich', dinner: 'Pasta' },
      };

      const result = await service.addDay(trek.id, organizer.id, dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.trekId).toBe(trek.id);
      expect(result.dayNumber).toBe(1);
      expect(result.title).toBe('Summit Attempt');
      expect(result.distanceKm).toBe(8.5);
      expect(result.altitudeGainM).toBe(1200);
      expect(result.accommodationType).toBe(AccommodationType.CAMP);
      expect((result.mealPlan as any).breakfast).toBe('Pancakes');
    });

    it('rejects when user is not the organizer', async () => {
      const organizer = await createOrganizer();
      const otherUser = await createOtherUser();
      const trek = await createTrek(organizer);

      const dto = {
        dayNumber: 1,
        title: 'Day 1',
        activityType: ActivityType.TREKKING as any,
      };

      await expect(service.addDay(trek.id, otherUser.id, dto)).rejects.toThrow(
        'You do not own this trek',
      );
    });

    it('rejects when trek does not exist', async () => {
      const dto = {
        dayNumber: 1,
        title: 'Day 1',
        activityType: ActivityType.TREKKING as any,
      };

      await expect(
        service.addDay('non-existent', 'user-1', dto),
      ).rejects.toThrow('Trek not found');
    });
  });

  describe('upsertDays', () => {
    it('replaces all existing days with new set', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      // Create initial day
      const initial = itineraryRepo.create({
        trekId: trek.id,
        dayNumber: 1,
        title: 'Old Day',
        activityType: ActivityType.TREKKING,
      });
      await itineraryRepo.save(initial);

      // Replace with 2 new days
      const newDays = [
        {
          dayNumber: 1,
          title: 'New Day 1',
          activityType: ActivityType.TREKKING as any,
          distanceKm: 5,
        },
        {
          dayNumber: 2,
          title: 'New Day 2',
          activityType: ActivityType.REST as any,
        },
      ];

      const result = await service.upsertDays(
        trek.id,
        organizer.id,
        newDays as any,
      );

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('New Day 1');
      expect(result[1].title).toBe('New Day 2');

      // Verify old day is gone
      const remaining = await itineraryRepo.find({
        where: { trekId: trek.id },
      });
      expect(remaining).toHaveLength(2);
    });
  });

  describe('updateDay', () => {
    it('updates specific fields on a day', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      const day = itineraryRepo.create({
        trekId: trek.id,
        dayNumber: 1,
        title: 'Original Title',
        activityType: ActivityType.TREKKING,
        distanceKm: 5,
      });
      await itineraryRepo.save(day);

      const result = await service.updateDay(day.id, organizer.id, {
        title: 'Updated Title',
        distanceKm: 12,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.distanceKm).toBe(12);
      // Fields not in dto should remain unchanged
      expect(result.dayNumber).toBe(1);
      expect(result.activityType).toBe(ActivityType.TREKKING);
    });
  });

  describe('deleteDay', () => {
    it('removes a day from the trek', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      const day = itineraryRepo.create({
        trekId: trek.id,
        dayNumber: 1,
        title: 'To Delete',
        activityType: ActivityType.TREKKING,
      });
      await itineraryRepo.save(day);

      await service.deleteDay(day.id, organizer.id);

      const remaining = await itineraryRepo.find({
        where: { trekId: trek.id },
      });
      expect(remaining).toHaveLength(0);
    });

    it('throws when day does not exist', async () => {
      await expect(service.deleteDay('non-existent', 'user-1')).rejects.toThrow(
        'Itinerary day not found',
      );
    });
  });

  describe('reorder', () => {
    it('reassigns day numbers based on provided order', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      const d1 = await itineraryRepo.save(
        itineraryRepo.create({
          trekId: trek.id,
          dayNumber: 1,
          title: 'A',
          activityType: ActivityType.TREKKING,
        }),
      );
      const d2 = await itineraryRepo.save(
        itineraryRepo.create({
          trekId: trek.id,
          dayNumber: 2,
          title: 'B',
          activityType: ActivityType.REST,
        }),
      );
      const d3 = await itineraryRepo.save(
        itineraryRepo.create({
          trekId: trek.id,
          dayNumber: 3,
          title: 'C',
          activityType: ActivityType.ACCLIMATIZATION,
        }),
      );

      const result = await service.reorder(trek.id, organizer.id, [
        d3.id,
        d1.id,
        d2.id,
      ]);

      expect(result).toHaveLength(3);
      expect(result.find((d: any) => d.id === d3.id)!.dayNumber).toBe(1);
      expect(result.find((d: any) => d.id === d1.id)!.dayNumber).toBe(2);
      expect(result.find((d: any) => d.id === d2.id)!.dayNumber).toBe(3);
    });

    it('throws when a day ID is not part of the trek', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      const d1 = await itineraryRepo.save(
        itineraryRepo.create({
          trekId: trek.id,
          dayNumber: 1,
          title: 'A',
          activityType: ActivityType.TREKKING,
        }),
      );

      await expect(
        service.reorder(trek.id, organizer.id, [d1.id, 'foreign-id']),
      ).rejects.toThrow();
    });
  });

  describe('unique constraint', () => {
    it('prevents two days with same trekId and dayNumber', async () => {
      const organizer = await createOrganizer();
      const trek = await createTrek(organizer);

      await itineraryRepo.save(
        itineraryRepo.create({
          trekId: trek.id,
          dayNumber: 1,
          title: 'First',
          activityType: ActivityType.TREKKING,
        }),
      );

      const duplicate = itineraryRepo.create({
        trekId: trek.id,
        dayNumber: 1,
        title: 'Duplicate',
        activityType: ActivityType.TREKKING,
      });

      await expect(itineraryRepo.save(duplicate)).rejects.toThrow();
    });
  });
});
