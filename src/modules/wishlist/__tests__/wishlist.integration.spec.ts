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
  OneToOne,
} from 'typeorm';
import { WishlistService } from '../wishlist.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// --- SQLite-compatible entities ---

@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) fullName?: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

@Entity({ name: 'wishlist_collections' })
class SqliteWishlistCollection {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 512, nullable: true }) description!:
    | string
    | null;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'varchar', length: 64, nullable: true }) shareToken!:
    | string
    | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'wishlist_items' })
class SqliteWishlistItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) collectionId!: string;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'varchar', length: 512, nullable: true }) notes!:
    | string
    | null;
  @Column({ type: 'int', default: 0 }) priority!: number;
  @Column({ type: 'int', default: 0 }) sortOrder!: number;
  @Column({ type: 'int', nullable: true }) basePriceInr!: number | null;
  @CreateDateColumn({ type: 'datetime' }) addedAt!: Date;
  @ManyToOne(() => SqliteWishlistCollection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collectionId' })
  collection!: SqliteWishlistCollection;
}

@Entity({ name: 'treks' })
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) name!: string;
}

@Entity({ name: 'trek_interactions' })
class SqliteTrekInteraction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) trekId!: string;
  @Column({ type: 'varchar' }) userId!: string;
  @Column({ type: 'varchar', length: 50 }) type!: string;
  @Column({ type: 'int', default: 1 }) weight!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @ManyToOne(() => SqliteTrek, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trekId' })
  trek!: SqliteTrek;
  @ManyToOne(() => SqliteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: SqliteUser;
}

describe('Wishlist Integration — Full Lifecycle', () => {
  let dataSource: DataSource;
  let service: WishlistService;
  let colRepo: Repository<SqliteWishlistCollection>;
  let itemRepo: Repository<SqliteWishlistItem>;
  let userRepo: Repository<SqliteUser>;
  let trekRepo: Repository<SqliteTrek>;
  let interactionRepo: Repository<SqliteTrekInteraction>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        SqliteUser,
        SqliteWishlistCollection,
        SqliteWishlistItem,
        SqliteTrek,
        SqliteTrekInteraction,
      ],
    });
    await dataSource.initialize();

    userRepo = dataSource.getRepository(SqliteUser);
    colRepo = dataSource.getRepository(SqliteWishlistCollection);
    itemRepo = dataSource.getRepository(SqliteWishlistItem);
    trekRepo = dataSource.getRepository(SqliteTrek);
    interactionRepo = dataSource.getRepository(SqliteTrekInteraction);

    service = new WishlistService(
      colRepo as unknown as Repository<any>,
      itemRepo as unknown as Repository<any>,
      trekRepo as unknown as Repository<any>,
      interactionRepo as unknown as Repository<any>,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await itemRepo.clear();
    await colRepo.clear();
    await userRepo.clear();
    await trekRepo.clear();
    await interactionRepo.clear();
  });

  async function createUser(id: string): Promise<SqliteUser> {
    return userRepo.save(userRepo.create({ id, email: `${id}@test.com` }));
  }

  // === LIFECYCLE: create collection → add items → share → view shared → cleanup ===
  test('full wishlist lifecycle: create → add items → share → view → delete', async () => {
    const user = await createUser('user-lifecycle');

    // 1. Create collection
    const col = await service.createCollection(user.id, {
      name: 'Bucket List',
      description: 'My dream treks',
    });
    expect(col.id).toBeDefined();
    expect(col.name).toBe('Bucket List');
    expect(col.items).toBeUndefined();

    // 2. Add items
    const item1 = await service.addItem(col.id, user.id, {
      trekId: 'trek-alpha',
      notes: 'Must do!',
      priority: 2,
    });
    expect(item1.trekId).toBe('trek-alpha');
    expect(item1.priority).toBe(2);

    const item2 = await service.addItem(col.id, user.id, {
      trekId: 'trek-beta',
      priority: 1,
    });
    expect(item2.trekId).toBe('trek-beta');

    // 3. List items in collection
    const items = await service.getItems(col.id, user.id);
    expect(items).toHaveLength(2);

    // 4. Update an item
    const updated = await service.updateItem(item1.id, user.id, {
      notes: 'Absolutely must do!',
    });
    expect(updated.notes).toBe('Absolutely must do!');

    // 5. Generate share token
    const token = await service.generateShareToken(col.id, user.id);
    expect(token).toHaveLength(16);

    // 6. View shared collection (different user, public endpoint)
    const shared = await service.getSharedCollection(token);
    expect(shared.name).toBe('Bucket List');
    expect(shared.items).toHaveLength(2);

    // 7. Quick-add another trek
    const quickItem = await service.quickAdd('trek-gamma', user.id);
    expect(quickItem.trekId).toBe('trek-gamma');

    // 8. Remove an item
    await service.removeItem(item2.id, user.id);
    const itemsAfter = await service.getItems(col.id, user.id);
    expect(itemsAfter).toHaveLength(2); // item1 + quickItem

    // 9. Delete collection (cascades)
    await service.deleteCollection(col.id, user.id);
    await expect(service.getItems(col.id, user.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  // === MULTI-COLLECTION MANAGEMENT ===
  test('multiple collections — each isolated per user', async () => {
    const u1 = await createUser('user-a');
    const u2 = await createUser('user-b');

    const colA = await service.createCollection(u1.id, {
      name: 'Summer Plans',
    });
    const colB = await service.createCollection(u1.id, {
      name: 'Winter Plans',
    });
    await service.createCollection(u2.id, { name: 'Favorites' });

    // User A sees 2 collections
    const colsA = await service.getCollections(u1.id);
    expect(colsA).toHaveLength(2);

    // User B sees 1
    const colsB = await service.getCollections(u2.id);
    expect(colsB).toHaveLength(1);

    // Add same trek to both A collections
    await service.addItem(colA.id, u1.id, { trekId: 'trek-1' });
    await service.addItem(colB.id, u1.id, { trekId: 'trek-1' }); // Same trek in different collection — ok

    const itemsA = await service.getItems(colA.id, u1.id);
    const itemsB = await service.getItems(colB.id, u1.id);
    expect(itemsA).toHaveLength(1);
    expect(itemsB).toHaveLength(1);
  });

  // === ERROR HANDLING ===
  test('error handling — cross-user access rejected', async () => {
    const u1 = await createUser('user-owner');
    const u2 = await createUser('user-intruder');

    const col = await service.createCollection(u1.id, { name: 'Private' });

    await expect(service.getItems(col.id, u2.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.addItem(col.id, u2.id, { trekId: 'x' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateCollection(col.id, u2.id, { name: 'Hacked' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.deleteCollection(col.id, u2.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  test('error handling — duplicate collection name', async () => {
    const user = await createUser('user-dup');
    await service.createCollection(user.id, { name: 'Unique' });
    await expect(
      service.createCollection(user.id, { name: 'Unique' }),
    ).rejects.toThrow(ConflictException);
  });

  test('error handling — duplicate trek in same collection', async () => {
    const user = await createUser('user-dup-item');
    const col = await service.createCollection(user.id, { name: 'Collection' });
    await service.addItem(col.id, user.id, { trekId: 'trek-1' });
    await expect(
      service.addItem(col.id, user.id, { trekId: 'trek-1' }),
    ).rejects.toThrow(ConflictException);
  });

  test('error handling — non-existent collection', async () => {
    const user = await createUser('user-ghost');
    await expect(
      service.getItems('00000000-0000-0000-0000-000000000000', user.id),
    ).rejects.toThrow(NotFoundException);
  });

  test('error handling — non-existent item', async () => {
    const user = await createUser('user-ghost-item');
    await expect(
      service.updateItem('00000000-0000-0000-0000-000000000000', user.id, {
        notes: 'x',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // === QUICK-ADD EDGE CASES ===
  test('quick-add when no default collection exists — creates one', async () => {
    const user = await createUser('user-empty');
    const item = await service.quickAdd('trek-first', user.id);

    expect(item.trekId).toBe('trek-first');

    const cols = await service.getCollections(user.id);
    expect(cols).toHaveLength(1);
    expect(cols[0].name).toBe('Saved Treks');
  });

  test('quick-add idempotent — same trek twice returns existing', async () => {
    const user = await createUser('user-idem');
    const r1 = await service.quickAdd('trek-1', user.id);
    const r2 = await service.quickAdd('trek-1', user.id);
    expect(r1.id).toBe(r2.id);
  });

  // === SHARE TOKEN EDGE CASES ===
  test('share token — invalid token returns 404', async () => {
    await expect(service.getSharedCollection('badtoken')).rejects.toThrow(
      NotFoundException,
    );
  });

  test('share token — same token always returned', async () => {
    const user = await createUser('user-share');
    const col = await service.createCollection(user.id, { name: 'Shared Col' });
    const t1 = await service.generateShareToken(col.id, user.id);
    const t2 = await service.generateShareToken(col.id, user.id);
    expect(t1).toBe(t2);
  });

  // === PRIORITY SORTING ===
  test('items ordered by priority DESC then addedAt ASC', async () => {
    const user = await createUser('user-sort');
    const col = await service.createCollection(user.id, { name: 'Sorted' });

    const low = await service.addItem(col.id, user.id, {
      trekId: 'trek-low',
      priority: 0,
    });
    const high = await service.addItem(col.id, user.id, {
      trekId: 'trek-high',
      priority: 2,
    });
    const mid = await service.addItem(col.id, user.id, {
      trekId: 'trek-mid',
      priority: 1,
    });

    const items = await service.getItems(col.id, user.id);
    expect(items[0].trekId).toBe('trek-high'); // priority 2 first
    expect(items[1].trekId).toBe('trek-mid'); // priority 1 second
    expect(items[2].trekId).toBe('trek-low'); // priority 0 last
  });

  // === CONCURRENCY SIMULATION ===
  test('concurrent quick-add of same trek — both succeed (idempotent)', async () => {
    const user = await createUser('user-concurrent');
    const [r1, r2] = await Promise.all([
      service.quickAdd('trek-race', user.id),
      service.quickAdd('trek-race', user.id),
    ]);
    // At least one should succeed; both return same or different — but should not throw
    expect(r1.trekId).toBe('trek-race');
    expect(r2.trekId).toBe('trek-race');
    const items = await service.getCollections(user.id);
    const allItems = await service.getItems(items[0].id, user.id);
    expect(allItems.length).toBeGreaterThanOrEqual(1);
    // Unique constraint means exactly 1 item created
    expect(allItems.length).toBe(1);
  });

  // === SQLITE-SPECIFIC: PRIORITY DEFAULT ===
  test('default priority is 0 when not specified', async () => {
    const user = await createUser('user-default-pri');
    const col = await service.createCollection(user.id, {
      name: 'Default Pri',
    });
    const item = await service.addItem(col.id, user.id, {
      trekId: 'trek-default',
    });
    expect(item.priority).toBe(0);
  });

  test('bulk operations — add 10 items, verify count', async () => {
    const user = await createUser('user-bulk');
    const col = await service.createCollection(user.id, { name: 'Bulk' });

    const promises = Array.from({ length: 10 }, (_, i) =>
      service.addItem(col.id, user.id, {
        trekId: `trek-${i}`,
        priority: i % 3,
      }),
    );
    await Promise.all(promises);

    const items = await service.getItems(col.id, user.id);
    expect(items).toHaveLength(10);
  });
});
