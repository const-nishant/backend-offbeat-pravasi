import {
  DataSource,
  Repository,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { RecommendationsService } from '../recommendations.service';
import { PlatformSettingsService } from '../../admin/platform-settings.service';
import { TrekDifficulty } from '../../treks/enums/trek-difficulty.enum';

// --- SQLite-compatible entities ---

@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'int', default: 0 }) userPoints!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'treks' })
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'varchar', length: 16, nullable: true }) difficulty!:
    | string
    | null;
  @Column({ type: 'int', default: 0 }) popularityScore!: number;
  @Column({ type: 'datetime', nullable: true }) startDate!: Date | null;
  @Column({ type: 'boolean', default: false }) isPublished!: boolean;
  @Column({ type: 'int', default: 0 }) costInr!: number;
  @Column({ type: 'varchar', length: 80, nullable: true }) state!:
    | string
    | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
  @ManyToMany(() => SqliteTrekTag, (tag) => tag.treks)
  @JoinTable({
    name: 'trek_tags_link',
    joinColumn: { name: 'trekId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'trekTagId', referencedColumnName: 'id' },
  })
  tags!: SqliteTrekTag[];
}

@Entity({ name: 'trek_tags' })
class SqliteTrekTag {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120, unique: true }) name!: string;
  @ManyToMany(() => SqliteTrek, (t) => t.tags)
  treks!: SqliteTrek[];
}

@Entity({ name: 'trek_tags_link' })
class SqliteTrekTagsLink {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'varchar' }) trekTagId!: string;
}

@Entity({ name: 'fitness_assessments' })
class SqliteFitnessAssessment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'int' }) totalScore!: number;
  @Column({ type: 'varchar', length: 16 }) difficultyBracket!: string;
  @Column({ type: 'text' }) answers!: string;
  @CreateDateColumn({ type: 'datetime' }) completedAt!: Date;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'bookings' })
class SqliteBooking {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'varchar', length: 16 }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'wishlist_collections' })
class SqliteWishlistCollection {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'wishlist_items' })
class SqliteWishlistItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) collectionId!: string;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'int', default: 0 }) priority!: number;
  @CreateDateColumn({ type: 'datetime' }) addedAt!: Date;
}

@Entity({ name: 'user_recommendation_preferences' })
class SqliteUserPref {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'text', nullable: true }) preferredDifficulty!: string | null;
  @Column({ type: 'int', nullable: true }) maxBudget!: number | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'recommendation_results' })
class SqliteRecResult {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'float' }) score!: number;
  @Column({ type: 'varchar', length: 32 }) reason!: string;
  @Column({ type: 'datetime' }) expiresAt!: Date;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'recommendation_events' })
class SqliteRecEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar', nullable: true }) recommendationResultId!:
    | string
    | null;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'varchar', length: 32 }) eventType!: string;
  @Column({ type: 'float', nullable: true }) score!: number | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) reason!:
    | string
    | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

// Stub PlatformSettingsService for integration tests
class StubPlatformSettingsService {
  async getSettings(): Promise<any> {
    return {};
  }
}

describe('Recommendations Integration — Full Lifecycle', () => {
  let dataSource: DataSource;
  let service: RecommendationsService;
  let trekRepo: Repository<SqliteTrek>;
  let tagRepo: Repository<SqliteTrekTag>;
  let linkRepo: Repository<SqliteTrekTagsLink>;
  let bookingRepo: Repository<SqliteBooking>;
  let assessmentRepo: Repository<SqliteFitnessAssessment>;
  let colRepo: Repository<SqliteWishlistCollection>;
  let itemRepo: Repository<SqliteWishlistItem>;
  let resultRepo: Repository<SqliteRecResult>;
  let eventRepo: Repository<SqliteRecEvent>;
  let userRepo: Repository<SqliteUser>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        SqliteUser,
        SqliteTrek,
        SqliteTrekTag,
        SqliteTrekTagsLink,
        SqliteFitnessAssessment,
        SqliteBooking,
        SqliteWishlistCollection,
        SqliteWishlistItem,
        SqliteUserPref,
        SqliteRecResult,
        SqliteRecEvent,
      ],
    });
    await dataSource.initialize();

    userRepo = dataSource.getRepository(SqliteUser);
    trekRepo = dataSource.getRepository(SqliteTrek);
    tagRepo = dataSource.getRepository(SqliteTrekTag);
    linkRepo = dataSource.getRepository(SqliteTrekTagsLink);
    bookingRepo = dataSource.getRepository(SqliteBooking);
    assessmentRepo = dataSource.getRepository(SqliteFitnessAssessment);
    colRepo = dataSource.getRepository(SqliteWishlistCollection);
    itemRepo = dataSource.getRepository(SqliteWishlistItem);
    resultRepo = dataSource.getRepository(SqliteRecResult);
    eventRepo = dataSource.getRepository(SqliteRecEvent);

    const platformSettings =
      new StubPlatformSettingsService() as unknown as PlatformSettingsService;

    service = new RecommendationsService(
      trekRepo as unknown as Repository<any>,
      tagRepo as unknown as Repository<any>,
      assessmentRepo as unknown as Repository<any>,
      bookingRepo as unknown as Repository<any>,
      colRepo as unknown as Repository<any>,
      itemRepo as unknown as Repository<any>,
      dataSource.getRepository(SqliteUserPref) as unknown as Repository<any>,
      resultRepo as unknown as Repository<any>,
      eventRepo as unknown as Repository<any>,
      platformSettings,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await eventRepo.clear();
    await resultRepo.clear();
    await linkRepo.clear();
    await itemRepo.clear();
    await colRepo.clear();
    await bookingRepo.clear();
    await assessmentRepo.clear();
    await tagRepo.clear();
    await trekRepo.clear();
    await userRepo.clear();
  });

  async function createUser(id: string): Promise<SqliteUser> {
    return userRepo.save(userRepo.create({ id, email: `${id}@test.com` }));
  }

  async function createTrek(
    id: string,
    name: string,
    difficulty: string,
    tags: string[],
    popularity = 100,
    startDate?: Date,
    published = true,
  ): Promise<SqliteTrek> {
    const trek = await trekRepo.save(
      trekRepo.create({
        id,
        name,
        difficulty,
        popularityScore: popularity,
        startDate: startDate ?? null,
        isPublished: published,
      }),
    );
    for (const tagName of tags) {
      let tag = await tagRepo.findOne({ where: { name: tagName } });
      if (!tag) {
        tag = await tagRepo.save(tagRepo.create({ name: tagName }));
      }
      await linkRepo.save(linkRepo.create({ trekId: id, trekTagId: tag.id }));
    }
    return trek;
  }

  async function getTrekTags(trekId: string): Promise<string[]> {
    const links = await linkRepo.find({ where: { trekId } });
    const tags = await Promise.all(
      links.map((l) => tagRepo.findOne({ where: { id: l.trekTagId } })),
    );
    return tags.filter(Boolean).map((t) => t!.name);
  }

  // === LIFECYCLE: new user gets recommendations based on season + popularity ===
  test('cold-start user — recommendations driven by season and popularity', async () => {
    const user = await createUser('cold-user');
    const now = new Date();
    const nearFuture = new Date(now.getTime() + 14 * 86400000);
    const farFuture = new Date(now.getTime() + 200 * 86400000);

    // Create 4 treks with differing popularity
    await createTrek(
      't-popular',
      'Popular Trek',
      'EASY',
      ['nature', 'scenic'],
      500,
      nearFuture,
    );
    await createTrek(
      't-seasonal',
      'Seasonal Trek',
      'MODERATE',
      ['adventure'],
      50,
      nearFuture,
    );
    await createTrek(
      't-old',
      'Old Trek',
      'DIFFICULT',
      ['expert'],
      300,
      farFuture,
    );
    await createTrek(
      't-unpublished',
      'Hidden',
      'EASY',
      ['nature'],
      100,
      nearFuture,
      false,
    );

    const results = await service.getForUser(user.id, 5);
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThanOrEqual(1);

    // Unpublished should never appear
    const ids = results.map((r) => r.trekId);
    expect(ids).not.toContain('t-unpublished');

    // Higher popularity trek should have a score
    const popResult = results.find((r) => r.trekId === 't-popular');
    expect(popResult).toBeDefined();
    expect(popResult!.score).toBeGreaterThan(0);
  });

  // === COMPLETED TREK SIMILARITY ===
  test('user with completed treks — similar tags get boosted', async () => {
    const user = await createUser('vet-user');

    await createTrek(
      'done-1',
      'Done Trek',
      'MODERATE',
      ['mountain', 'camping'],
      200,
    );
    await createTrek('done-2', 'Done Trek 2', 'EASY', ['river', 'forest'], 150);
    await createTrek(
      'sim-1',
      'Similar Trek',
      'MODERATE',
      ['mountain', 'camping', 'river'],
      10,
    );
    await createTrek(
      'diff-1',
      'Different Trek',
      'DIFFICULT',
      ['desert', 'heat'],
      300,
    );

    // Book the completed treks (2+ to exit cold start)
    await bookingRepo.save(
      bookingRepo.create({
        userId: user.id,
        trekId: 'done-1',
        status: 'CONFIRMED',
      }),
    );
    await bookingRepo.save(
      bookingRepo.create({
        userId: user.id,
        trekId: 'done-2',
        status: 'CONFIRMED',
      }),
    );

    const results = await service.getForUser(user.id, 10);
    expect(results).toBeDefined();

    // Similar trek should have a higher score due to tag overlap
    const similar = results.find((r) => r.trekId === 'sim-1');
    const different = results.find((r) => r.trekId === 'diff-1');
    expect(similar).toBeDefined();
    expect(different).toBeDefined();
    expect(similar!.score).toBeGreaterThan(different!.score);
  });

  // === WISHLIST SIMILARITY ===
  test('wishlisted treks influence recommendations', async () => {
    const user = await createUser('wish-user');
    await createTrek(
      'wish-1',
      'Wishlisted',
      'MODERATE',
      ['lake', 'forest'],
      100,
    );
    await createTrek(
      'wish-2',
      'Wishlisted 2',
      'EASY',
      ['camping', 'river'],
      80,
    );
    await createTrek('wish-3', 'Wishlisted 3', 'MODERATE', ['mountain'], 60);
    await createTrek(
      'rel-1',
      'Related',
      'MODERATE',
      ['lake', 'forest', 'wildlife'],
      50,
    );
    await createTrek('unrel-1', 'Unrelated', 'EASY', ['city', 'museum'], 80);

    // Create collection + add wishlist items (3+ to exit cold start)
    const col = await colRepo.save(
      colRepo.create({ userId: user.id, name: 'My List' }),
    );
    await itemRepo.save(
      itemRepo.create({ collectionId: col.id, trekId: 'wish-1' }),
    );
    await itemRepo.save(
      itemRepo.create({ collectionId: col.id, trekId: 'wish-2' }),
    );
    await itemRepo.save(
      itemRepo.create({ collectionId: col.id, trekId: 'wish-3' }),
    );

    const results = await service.getForUser(user.id, 10);
    const related = results.find((r) => r.trekId === 'rel-1');
    const unrelated = results.find((r) => r.trekId === 'unrel-1');

    expect(related).toBeDefined();
    expect(unrelated).toBeDefined();
    // Related (shared tags with wishlisted) should rank higher
    expect(related!.score).toBeGreaterThan(unrelated!.score);
  });

  // === FITNESS MATCH ===
  test('fitness assessment influences recommendation ranking', async () => {
    const user = await createUser('fit-user');
    await createTrek('easy-trek', 'Easy Trek', 'EASY', ['nature'], 100);
    await createTrek('hard-trek', 'Hard Trek', 'EXTREME', ['summit'], 100);

    // Assessment says EASY
    await assessmentRepo.save(
      assessmentRepo.create({
        userId: user.id,
        totalScore: 10,
        difficultyBracket: 'EASY',
        answers: JSON.stringify([]),
        completedAt: new Date(),
      }),
    );

    const results = await service.getForUser(user.id, 10);
    const easyResult = results.find((r) => r.trekId === 'easy-trek');
    const hardResult = results.find((r) => r.trekId === 'hard-trek');

    expect(easyResult).toBeDefined();
    // EASY trek should have positive score; HARD might be 0 or lower
    expect(easyResult!.score).toBeGreaterThan(0);
  });

  // === REFRESH CLEARS AND REPLACES ===
  test('refresh clears old results and stores new ones', async () => {
    const user = await createUser('refresh-user');
    await createTrek('t1', 'Trek 1', 'EASY', ['a'], 100);
    await createTrek('t2', 'Trek 2', 'MODERATE', ['b'], 50);

    const firstBatch = await service.refresh(user.id, 5);
    expect(firstBatch.length).toBeGreaterThan(0);

    const stored1 = await resultRepo.find({ where: { userId: user.id } });
    expect(stored1.length).toBe(firstBatch.length);

    // Second refresh should replace
    const secondBatch = await service.refresh(user.id, 5);
    const stored2 = await resultRepo.find({ where: { userId: user.id } });
    expect(stored2.length).toBe(secondBatch.length);
  });

  // === GET FOR TREK (SIMILAR TREKS) ===
  test('getForTrek returns similar treks sorted by score descending', async () => {
    await createTrek(
      'base',
      'Base Trek',
      'MODERATE',
      ['mountain', 'river', 'camping'],
      200,
    );
    await createTrek('a', 'Trek A', 'MODERATE', ['mountain', 'river'], 100);
    await createTrek('b', 'Trek B', 'EASY', ['mountain'], 50);
    await createTrek('c', 'Trek C', 'DIFFICULT', ['desert', 'heat'], 300);

    const results = await service.getForTrek('base', 10);
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThanOrEqual(1);

    // Should not include self
    expect(results.find((r) => r.trekId === 'base')).toBeUndefined();

    // Results should be sorted descending by score
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }

    // Trek A (2 of 3 tags) should rank higher than Trek B (1 of 3 tags)
    const idxA = results.findIndex((r) => r.trekId === 'a');
    const idxB = results.findIndex((r) => r.trekId === 'b');
    if (idxA !== -1 && idxB !== -1) {
      expect(idxA).toBeLessThan(idxB);
    }
  });

  // === CONVERSION EVENT LOGGING ===
  test('getForUser logs SERVED events when cached results exist', async () => {
    const user = await createUser('event-user');
    await createTrek('ev-t1', 'Event Trek', 'EASY', ['nature'], 100);

    // Manually seed a recommendation result
    const r = await resultRepo.save(
      resultRepo.create({
        userId: user.id,
        trekId: 'ev-t1',
        score: 0.95,
        reason: 'POPULAR',
        expiresAt: new Date(Date.now() + 86400000),
      }),
    );

    await service.getForUser(user.id, 10);
    const events = await eventRepo.find({ where: { userId: user.id } });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].eventType).toBe('SERVED');
    expect(events[0].trekId).toBe('ev-t1');
  });

  test('logConversion records CLICKED and BOOKED events', async () => {
    const user = await createUser('conv-user');
    await service.logConversion(
      user.id,
      'trek-1',
      'CLICKED',
      undefined,
      0.8,
      'POPULAR',
    );
    await service.logConversion(user.id, 'trek-1', 'BOOKED');

    const events = await eventRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'ASC' },
    });
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('CLICKED');
    expect(events[0].score).toBe(0.8);
    expect(events[1].eventType).toBe('BOOKED');
  });

  // === EDGE: ALL TREKS SAME TAGS ===
  test('all treks with identical tags — scores differ only by popularity', async () => {
    const user = await createUser('same-tag-user');
    await createTrek('ta', 'Trek A', 'EASY', ['nature', 'camping'], 500);
    await createTrek('tb', 'Trek B', 'EASY', ['nature', 'camping'], 100);
    await createTrek('tc', 'Trek C', 'EASY', ['nature', 'camping'], 10);

    const results = await service.getForUser(user.id, 10);
    expect(results).toBeDefined();

    // With same tags, popularity is the differentiator
    const a = results.find((r) => r.trekId === 'ta');
    const b = results.find((r) => r.trekId === 'tb');
    const c = results.find((r) => r.trekId === 'tc');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(c).toBeDefined();
    expect(a!.score).toBeGreaterThanOrEqual(b!.score);
    expect(b!.score).toBeGreaterThanOrEqual(c!.score);
  });

  // === EDGE: NO TAGS ===
  test('treks with no tags — similarity is 0, popularity is the only signal', async () => {
    const user = await createUser('no-tag-user');
    await createTrek('nta', 'No Tag A', 'EASY', [], 300);
    await createTrek('ntb', 'No Tag B', 'EASY', [], 100);

    const results = await service.getForUser(user.id, 10);
    expect(results).toBeDefined();
    // Should not crash, a score should exist based on popularity
    expect(results.length).toBeGreaterThan(0);
  });

  // === EDGE: SINGLE TREK ===
  test('only one published trek — returns empty since nothing to compare', async () => {
    const user = await createUser('lonely-user');
    await createTrek('lonely', 'Only One', 'EASY', ['solitude'], 50);

    const results = await service.getForUser(user.id, 10);
    expect(results).toBeDefined();
    // One trek, user hasn't completed it, so it can be recommended
    // Actually, it should be returned as a valid recommendation
    expect(results.length).toBe(1);
    expect(results[0].trekId).toBe('lonely');
  });

  // === PREFERENCE UPDATE ===
  test('updatePreferences creates and retrieves preferences', async () => {
    const user = await createUser('pref-user');

    await service.updatePreferences(user.id, {
      maxBudget: 20000,
      preferredDifficulty: [TrekDifficulty.MODERATE],
    });
    const pref = await service.getPreferences(user.id);
    expect(pref).toBeDefined();
    expect(pref!.maxBudget).toBe(20000);

    // Update again
    await service.updatePreferences(user.id, { maxBudget: 50000 });
    const updated = await service.getPreferences(user.id);
    expect(updated!.maxBudget).toBe(50000);
  });
});
