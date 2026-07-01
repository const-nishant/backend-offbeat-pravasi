import {
  DataSource,
  Repository,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BookingStatus } from '../entities/booking.entity';
import { PaymentStatus } from '../entities/payment.entity';
import { BookingsService } from '../bookings.service';
import { TicketService } from '../ticket.service';
import { PoliciesService } from '../../policies/policies.service';
import { JwtService } from '@nestjs/jwt';
import {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';

// ─── SQLite-compatible entities ─────────────────────────────────────

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
  @Column({ type: 'varchar', length: 80, nullable: true }) username!:
    | string
    | null;
  @Column({ type: 'varchar', nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', nullable: true }) location!: string | null;
  @Column({ type: 'varchar', nullable: true }) gender!: string | null;
  @Column({ type: 'date', nullable: true }) dateOfBirth!: Date | null;
  @Column({ type: 'varchar', nullable: true }) profileImageUrl!: string | null;
  @Column({ type: 'varchar', nullable: true }) bannerImageUrl!: string | null;
  @Column({ type: 'boolean', default: false }) isAdmin!: boolean;
  @Column({ type: 'varchar', default: 'NONE' }) organizerStatus!: string;
  @Column({ type: 'boolean', default: false }) emailVerified!: boolean;
  @Column({ type: 'datetime', nullable: true }) emailVerifiedAt!: Date | null;
  @Column({ type: 'float', default: 0 }) userPoints!: number;
  @Column({ type: 'int', default: 0 }) userDistanceTravelled!: number;
  @Column({ type: 'float', default: 0 }) organizerRating!: number;
  @Column({ type: 'boolean', default: false }) isOrganizerActive!: boolean;
  @Column({ type: 'boolean', default: false }) isSuspended!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'treks' })
@Index(['state'])
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteUser, { nullable: true })
  organizer!: SqliteUser | null;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) slug!:
    | string
    | null;
  @Column({ type: 'varchar', length: 512, nullable: true }) shortDescription!:
    | string
    | null;
  @Column({ type: 'text', nullable: true }) fullDescription!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) state!:
    | string
    | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) location!:
    | string
    | null;
  @Column({ type: 'float', nullable: true }) latitude!: number | null;
  @Column({ type: 'float', nullable: true }) longitude!: number | null;
  @Column({ type: 'datetime', nullable: true }) startDate!: Date | null;
  @Column({ type: 'datetime', nullable: true }) endDate!: Date | null;
  @Column({ type: 'varchar', nullable: true }) difficulty!: string | null;
  @Column({ type: 'int', default: 0 }) costInr!: number;
  @Column({ type: 'int', default: 1 }) maxParticipants!: number;
  @Column({ type: 'boolean', default: false }) isPublished!: boolean;
  @Column({ type: 'int', default: 0 }) currentParticipants!: number;
  @Column({ type: 'varchar', length: 32, default: 'DRAFT' }) status!: string;
  @Column({ type: 'float', default: 0 }) avgRating!: number;
  @Column({ type: 'int', default: 0 }) ratingCount!: number;
  @Column({ type: 'int', default: 0 }) popularityScore!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}

@Entity({ name: 'bookings' })
@Index(['trekId', 'status'])
class SqliteBooking {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') trekId!: string;
  @Column({ type: 'simple-json', nullable: false }) trekSnapshot: any;
  @Column('uuid') userId!: string;
  @Column({ type: 'simple-json', nullable: true }) participants?: any[];
  @Column('int') quantity!: number;
  @Column('int') unitPriceInr!: number;
  @Column('int') totalAmountInr!: number;
  @Column({ type: 'varchar', length: 32, default: BookingStatus.PENDING })
  @Index()
  status: BookingStatus = BookingStatus.PENDING;
  @Column('uuid', { nullable: true }) paymentId?: string;
  @Column({ type: 'datetime', nullable: true }) holdExpiresAt?: Date;
  @Column({ type: 'simple-json', nullable: true }) metadata?: any;
  @CreateDateColumn() createdAt: Date = new Date();
  @UpdateDateColumn() updatedAt: Date = new Date();
  @DeleteDateColumn() deletedAt?: Date;
}

@Entity({ name: 'payments' })
class SqlitePayment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') bookingId!: string;
  @Column({ type: 'varchar', length: 32 }) provider!: string;
  @Column('varchar', { nullable: true }) providerPaymentId?: string;
  @Column({ type: 'varchar', length: 32, default: PaymentStatus.CREATED })
  @Index()
  status: PaymentStatus = PaymentStatus.CREATED;
  @Column('int') amountInr!: number;
  @Column('varchar', { default: 'INR' }) currency: string = 'INR';
  @Column({ type: 'simple-json', nullable: true }) providerResponse?: any;
  @Column('varchar', { nullable: true }) idempotencyKey?: string;
  @Column({ type: 'simple-json', nullable: true }) metadata?: any;
  @CreateDateColumn() createdAt: Date = new Date();
  @UpdateDateColumn() updatedAt: Date = new Date();
}

// ─── SQLite-compatible Policy entities ─────────────────────────────

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

// ─── Tests ─────────────────────────────────────────────────────────

let organizerEmailIndex = 0;

describe('Bookings-Policy Integration QA (12y exp)', () => {
  let dataSource: DataSource;
  let bookingsService: BookingsService;
  let policiesService: PoliciesService;
  let bookingRepo: Repository<SqliteBooking>;
  let trekRepo: Repository<SqliteTrek>;
  let userRepo: Repository<SqliteUser>;
  let paymentRepo: Repository<SqlitePayment>;
  let snapshotRepo: Repository<SqliteBookingPolicySnapshot>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        SqliteUser,
        SqliteTrek,
        SqliteBooking,
        SqlitePayment,
        SqliteCancellationPolicy,
        SqliteCancellationTier,
        SqliteTrekPolicy,
        SqliteBookingPolicySnapshot,
      ],
    });
    await dataSource.initialize();

    bookingRepo = dataSource.getRepository(SqliteBooking) as any;
    trekRepo = dataSource.getRepository(SqliteTrek) as any;
    userRepo = dataSource.getRepository(SqliteUser) as any;
    paymentRepo = dataSource.getRepository(SqlitePayment) as any;
    snapshotRepo = dataSource.getRepository(SqliteBookingPolicySnapshot) as any;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  function buildServices() {
    const settingsService = {
      getSettings: async () => ({ holdWindowMinutes: 15 }),
    } as any;
    const ticketService = new TicketService({
      signAsync: jest.fn().mockResolvedValue('signed-ticket-token'),
      verifyAsync: jest.fn(),
    } as unknown as JwtService);
    const mailerService = { sendBookingCancellationEmail: jest.fn() } as any;
    const notificationsService = {
      notifyBookingCancelled: jest.fn().mockResolvedValue(undefined),
    } as any;

    const policyRepo = dataSource.getRepository(
      SqliteCancellationPolicy,
    ) as any;
    const tierRepo = dataSource.getRepository(SqliteCancellationTier) as any;
    const trekPolicyRepo = dataSource.getRepository(SqliteTrekPolicy) as any;

    policiesService = new PoliciesService(
      policyRepo,
      tierRepo,
      trekPolicyRepo,
      snapshotRepo as any,
    );

    bookingsService = new BookingsService(
      bookingRepo as any,
      trekRepo as any,
      paymentRepo as any,
      settingsService,
      ticketService,
      dataSource,
      notificationsService,
      mailerService,
      policiesService,
    );
  }

  // Note: QA-1 (auto snapshot creation) and QA-5 (multi booking snapshots)
  // are covered by unit tests in bookings.service.spec.ts and policies.service.spec.ts.
  // These integration tests focus on the DB-level refund/cancellation behavior
  // which bypasses createBooking's internal em.getRepository(Trek) SQLite limitation.

  // ─── QA-2: CANCELLATION USES SNAPSHOT ────────────────────────────

  test('QA-2: Cancellation uses snapshot policy for refund calc, not current policy', async () => {
    buildServices();
    organizerEmailIndex++;

    const org = await userRepo.save(
      userRepo.create({
        email: `org-qa2-${organizerEmailIndex}@test.com`,
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      }),
    );

    const originalPolicy = await policiesService.create({
      name: 'Original-Lenient',
      isDefault: true,
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

    const startDate = new Date(Date.now() + 86400000 * 30);
    const trek = await trekRepo.save(
      trekRepo.create({
        name: `QA-Trek2-${Date.now()}`,
        maxParticipants: 10,
        costInr: 10000,
        isPublished: true,
        organizer: org,
        startDate,
      } as any),
    );

    // Create booking manually (bypass createBooking to avoid Trek entity issue)
    const booking = await bookingRepo.save(
      bookingRepo.create({
        trekId: trek.id,
        userId: 'user-qa-2',
        quantity: 2,
        unitPriceInr: 10000,
        totalAmountInr: 20000,
        status: BookingStatus.CONFIRMED,
        trekSnapshot: {
          id: trek.id,
          name: trek.name,
          startDate: startDate.toISOString(),
        },
      } as any),
    );

    // Create snapshot with "Original-Lenient" policy at booking time
    await snapshotRepo.save({
      bookingId: booking.id,
      policyName: 'Original-Lenient',
      tiers: [
        { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
        { fromHours: 0, toHours: 167, refundPercentage: 0, sortOrder: 2 },
      ],
    } as any);

    // Admin changes policy AFTER booking (should NOT affect this booking)
    const strictPolicy = await policiesService.create({
      name: 'New-Strict',
      isDefault: true,
      tiers: [
        { fromHoursBeforeStart: 168, refundPercentage: 25, sortOrder: 1 },
        {
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 167,
          refundPercentage: 0,
          sortOrder: 2,
        },
      ],
    });
    await policiesService.assignToTrek(trek.id, strictPolicy.id);

    const result = await bookingsService.cancelBooking(booking.id, 'user-qa-2');

    expect(result.booking.metadata.refundPolicyName).toBe('Original-Lenient');
    expect(result.booking.metadata.refundPercentage).toBe(100);
    expect(result.booking.metadata.refundAmount).toBe(20000);
  });

  // ─── QA-3: CANCELLATION WITH PAYMENT ─────────────────────────────

  test('QA-3: Cancellation with succeeded payment stores refund metadata on payment record', async () => {
    buildServices();
    organizerEmailIndex++;

    const org = await userRepo.save(
      userRepo.create({
        email: `org-qa3-${organizerEmailIndex}@test.com`,
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      }),
    );

    await policiesService.create({
      name: 'QA-Refund',
      isDefault: true,
      tiers: [{ fromHoursBeforeStart: 0, refundPercentage: 50, sortOrder: 1 }],
    });

    const startDate = new Date(Date.now() + 86400000 * 30);
    const trek = await trekRepo.save(
      trekRepo.create({
        name: `QA-Trek3-${Date.now()}`,
        maxParticipants: 10,
        costInr: 2000,
        isPublished: true,
        organizer: org,
        startDate,
      } as any),
    );

    const booking = await bookingRepo.save(
      bookingRepo.create({
        trekId: trek.id,
        userId: 'user-qa-3',
        quantity: 1,
        unitPriceInr: 2000,
        totalAmountInr: 2000,
        status: BookingStatus.CONFIRMED,
        trekSnapshot: {
          id: trek.id,
          name: trek.name,
          startDate: startDate.toISOString(),
        },
      } as any),
    );

    await snapshotRepo.save({
      bookingId: booking.id,
      policyName: 'QA-Refund',
      tiers: [{ fromHours: 0, refundPercentage: 50, sortOrder: 1 }],
    } as any);

    const payment = await paymentRepo.save(
      paymentRepo.create({
        bookingId: booking.id,
        amountInr: 2000,
        currency: 'INR',
        provider: 'STRIPE',
        status: PaymentStatus.SUCCEEDED,
        providerPaymentId: 'pi_test_123',
      } as any),
    );

    const result = await bookingsService.cancelBooking(booking.id, 'user-qa-3');

    expect(result.booking.metadata.refundAmount).toBe(1000);
    expect(result.booking.metadata.refunded).toBe(true);

    const savedPayment = await paymentRepo.findOne({
      where: { id: payment.id } as any,
    });
    expect(savedPayment!.metadata.refundPercentage).toBe(50);
    expect(savedPayment!.metadata.refundAmount).toBe(1000);
  });

  // ─── QA-4: CANCELLATION WITHOUT START DATE IN SNAPSHOT ───────────

  test('QA-4: Cancellation gracefully handles missing startDate in trekSnapshot', async () => {
    buildServices();

    const booking = await bookingRepo.save(
      bookingRepo.create({
        trekId: 'some-trek',
        userId: 'user-qa-4',
        quantity: 1,
        unitPriceInr: 1000,
        totalAmountInr: 1000,
        status: BookingStatus.CONFIRMED,
        trekSnapshot: { id: 'trek-x', name: 'No Date Trek' },
      } as any),
    );

    const result = await bookingsService.cancelBooking(booking.id, 'user-qa-4');

    expect(result.booking.status).toBe(BookingStatus.CANCELLED);
    expect(result.booking.metadata.refundPercentage).toBe(0);
    expect(result.booking.metadata.refundAmount).toBe(0);
    expect(result.booking.metadata.refundPolicyName).toBe('Standard');
  });

  // ─── QA-6: CANCELLING WITH PARTIAL REFUND (HOURS-BASED) ──────────

  test('QA-6: Booking cancelled within partial refund window gets correct %', async () => {
    buildServices();
    organizerEmailIndex++;

    const org = await userRepo.save(
      userRepo.create({
        email: `org-qa6-${organizerEmailIndex}@test.com`,
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      }),
    );

    const startDate = new Date(Date.now() + 100 * 3600000);
    const trek = await trekRepo.save(
      trekRepo.create({
        name: `QA-Trek6-${Date.now()}`,
        maxParticipants: 10,
        costInr: 4000,
        isPublished: true,
        organizer: org,
        startDate,
      } as any),
    );

    const booking = await bookingRepo.save(
      bookingRepo.create({
        trekId: trek.id,
        userId: 'user-qa-6',
        quantity: 2,
        unitPriceInr: 4000,
        totalAmountInr: 8000,
        status: BookingStatus.CONFIRMED,
        trekSnapshot: {
          id: trek.id,
          name: trek.name,
          startDate: startDate.toISOString(),
        },
      } as any),
    );

    // Snapshot with tiered refunds (100% >=168h, 50% 24-167h, 0% <24h)
    await snapshotRepo.save({
      bookingId: booking.id,
      policyName: 'Tiered',
      tiers: [
        { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
        { fromHours: 24, toHours: 167, refundPercentage: 50, sortOrder: 2 },
        { fromHours: 0, toHours: 23, refundPercentage: 0, sortOrder: 3 },
      ],
    } as any);

    const result = await bookingsService.cancelBooking(booking.id, 'user-qa-6');
    expect(result.booking.metadata.refundPercentage).toBe(50);
    expect(result.booking.metadata.refundAmount).toBe(4000);
  });

  // ─── QA-7: CANCELLED AFTER TREK STARTED ──────────────────────────

  test('QA-7: Booking cancelled after trek already started gets 0 refund', async () => {
    buildServices();
    organizerEmailIndex++;

    const org = await userRepo.save(
      userRepo.create({
        email: `org-qa7-${organizerEmailIndex}@test.com`,
        passwordHash: 'hash',
        organizerStatus: 'APPROVED',
        isOrganizerActive: true,
      }),
    );

    const pastStart = new Date(Date.now() - 86400000);
    const trek = await trekRepo.save(
      trekRepo.create({
        name: `QA-Trek7-${Date.now()}`,
        maxParticipants: 10,
        costInr: 5000,
        isPublished: true,
        organizer: org,
        startDate: pastStart,
      } as any),
    );

    const booking = await bookingRepo.save(
      bookingRepo.create({
        trekId: trek.id,
        userId: 'user-qa-7',
        quantity: 1,
        unitPriceInr: 5000,
        totalAmountInr: 5000,
        status: BookingStatus.CONFIRMED,
        trekSnapshot: {
          id: trek.id,
          name: trek.name,
          startDate: pastStart.toISOString(),
        },
      } as any),
    );

    await snapshotRepo.save({
      bookingId: booking.id,
      policyName: 'Strict',
      tiers: [
        { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
        { fromHours: 0, toHours: 167, refundPercentage: 0, sortOrder: 2 },
      ],
    } as any);

    const result = await bookingsService.cancelBooking(booking.id, 'user-qa-7');
    expect(result.booking.metadata.refundPercentage).toBe(0);
    expect(result.booking.metadata.refundAmount).toBe(0);
  });
});
