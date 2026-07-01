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
  Index,
  OneToMany,
} from 'typeorm';
import { PoliciesService } from '../policies.service';
import {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
  beforeEach,
} from '@jest/globals';

// --- SQLite-compatible entities ---

@Entity({ name: 'cancellation_policies' })
class SqliteCancellationPolicy {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 80 }) name!: string;
  @Column({ type: 'varchar', length: 512, nullable: true })
  description?: string;
  @Column({ type: 'boolean', default: false }) isDefault!: boolean;
  @OneToMany(() => SqliteCancellationTier, (t) => t.policy, {
    cascade: true,
    eager: true,
  })
  tiers!: SqliteCancellationTier[];
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'cancellation_tiers' })
@Index(['policyId', 'sortOrder'])
class SqliteCancellationTier {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') policyId!: string;
  @ManyToOne(() => SqliteCancellationPolicy, (p) => p.tiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policyId' })
  policy!: SqliteCancellationPolicy;
  @Column('int') fromHoursBeforeStart!: number;
  @Column('int', { nullable: true }) toHoursBeforeStart?: number;
  @Column('int') refundPercentage!: number;
  @Column('int') sortOrder!: number;
}

@Entity({ name: 'trek_policies' })
class SqliteTrekPolicy {
  @PrimaryGeneratedColumn('uuid') trekId!: string;
  @Column('uuid') policyId!: string;
  @ManyToOne(() => SqliteCancellationPolicy)
  @JoinColumn({ name: 'policyId' })
  policy!: SqliteCancellationPolicy;
}

@Entity({ name: 'booking_policy_snapshots' })
class SqliteBookingPolicySnapshot {
  @Column('uuid') bookingId!: string;
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 80 }) policyName!: string;
  @Column({ type: 'simple-json' }) tiers!: any[];
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

// --- Tests ---

describe('PoliciesService integration (sqlite)', () => {
  let dataSource: DataSource;
  let service: PoliciesService;
  let policyRepo: Repository<SqliteCancellationPolicy>;
  let tierRepo: Repository<SqliteCancellationTier>;
  let trekPolicyRepo: Repository<SqliteTrekPolicy>;
  let snapshotRepo: Repository<SqliteBookingPolicySnapshot>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        SqliteCancellationPolicy,
        SqliteCancellationTier,
        SqliteTrekPolicy,
        SqliteBookingPolicySnapshot,
      ],
    });
    await dataSource.initialize();

    policyRepo = dataSource.getRepository(SqliteCancellationPolicy) as any;
    tierRepo = dataSource.getRepository(SqliteCancellationTier) as any;
    trekPolicyRepo = dataSource.getRepository(SqliteTrekPolicy) as any;
    snapshotRepo = dataSource.getRepository(SqliteBookingPolicySnapshot) as any;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  const buildService = () => {
    return new PoliciesService(
      policyRepo as any,
      tierRepo as any,
      trekPolicyRepo as any,
      snapshotRepo as any,
    );
  };

  test('should create and find a policy with tiers', async () => {
    service = buildService();

    const created = await service.create({
      name: 'Flexible',
      description: 'Flexible policy',
      isDefault: true,
      tiers: [
        { fromHoursBeforeStart: 168, refundPercentage: 100, sortOrder: 1 },
        {
          fromHoursBeforeStart: 48,
          toHoursBeforeStart: 167,
          refundPercentage: 50,
          sortOrder: 2,
        },
        {
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 47,
          refundPercentage: 0,
          sortOrder: 3,
        },
      ],
    });

    expect(created.name).toBe('Flexible');
    expect(created.isDefault).toBe(true);
    expect(created.tiers).toHaveLength(3);

    const found = await service.findOne(created.id);
    expect(found.name).toBe('Flexible');
    expect(found.tiers).toHaveLength(3);
  });

  test('should return default policy', async () => {
    service = buildService();

    const p1 = await service.create({
      name: 'Strict',
      isDefault: false,
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 0, sortOrder: 1 }],
    });

    const p2 = await service.create({
      name: 'Standard',
      isDefault: true,
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 50, sortOrder: 1 }],
    });

    const defaultPolicy = await service.getDefault();
    expect(defaultPolicy.name).toBe('Standard');
    expect(defaultPolicy.id).toBe(p2.id);
  });

  test('should update a policy and replace tiers', async () => {
    service = buildService();

    const created = await service.create({
      name: 'Old',
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 0, sortOrder: 1 }],
    });

    const updated = await service.update(created.id, {
      name: 'New Name',
      tiers: [
        { fromHoursBeforeStart: 24, refundPercentage: 100, sortOrder: 1 },
        {
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 23,
          refundPercentage: 25,
          sortOrder: 2,
        },
      ],
    });

    expect(updated.name).toBe('New Name');
    expect(updated.tiers).toHaveLength(2);
    expect(updated.tiers[0].refundPercentage).toBe(100);
  });

  test('should delete a policy', async () => {
    service = buildService();

    const created = await service.create({
      name: 'Temp',
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 0, sortOrder: 1 }],
    });

    await service.delete(created.id);

    await expect(service.findOne(created.id)).rejects.toThrow();
  });

  test('should assign policy to trek and retrieve it', async () => {
    service = buildService();

    const policy = await service.create({
      name: 'Strict',
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 0, sortOrder: 1 }],
    });

    await service.assignToTrek('trek-1', policy.id);

    const result = await service.getForTrek('trek-1');
    expect(result.name).toBe('Strict');
  });

  test('should fall back to default when trek has no explicit policy', async () => {
    service = buildService();

    const defaultPolicy = await service.create({
      name: 'DefaultPolicy',
      isDefault: true,
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 100, sortOrder: 1 }],
    });

    const result = await service.getForTrek('trek-no-assignment');
    expect(result.name).toBe('DefaultPolicy');
  });

  test('should create snapshot and calculate refund correctly', async () => {
    service = buildService();

    const policy = await service.create({
      name: 'TestPolicy',
      tiers: [
        { fromHoursBeforeStart: 168, refundPercentage: 100, sortOrder: 1 },
        {
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 167,
          refundPercentage: 50,
          sortOrder: 2,
        },
      ],
    });

    await service.assignToTrek('trek-1', policy.id);

    await service.createSnapshot('booking-1', 'trek-1');

    const futureDate = new Date(Date.now() + 86400000 * 30);
    const result = await service.calculateRefund('booking-1', 5000, futureDate);

    expect(result.refundPercentage).toBeGreaterThan(0);
    expect(result.refundAmount).toBeGreaterThan(0);
    expect(result.policyName).toBe('TestPolicy');
  });

  test('should return 0 refund for a trek that has already started', async () => {
    service = buildService();

    const policy = await service.create({
      name: 'Strict',
      tiers: [
        { fromHoursBeforeStart: 168, refundPercentage: 100, sortOrder: 1 },
        {
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 167,
          refundPercentage: 0,
          sortOrder: 2,
        },
      ],
    });

    await service.assignToTrek('trek-2', policy.id);
    await service.createSnapshot('booking-2', 'trek-2');

    const pastDate = new Date(Date.now() - 86400000);
    const result = await service.calculateRefund('booking-2', 2000, pastDate);

    expect(result.refundPercentage).toBe(0);
    expect(result.refundAmount).toBe(0);
  });
});
