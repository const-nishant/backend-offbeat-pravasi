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
  ManyToMany,
  OneToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { BookingStatus } from '../entities/booking.entity';
import { PaymentStatus } from '../entities/payment.entity';
import { BookingsService } from '../bookings.service';
import { TicketService } from '../ticket.service';
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

// SQLite-compatible User entity
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

// SQLite-compatible Trek entity
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

// SQLite-compatible Booking entity
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

// SQLite-compatible Payment entity
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

// SQLite-compatible TrekImage entity
@Entity({ name: 'trek_images' })
class SqliteTrekImage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteTrek, { onDelete: 'CASCADE' }) trek!: SqliteTrek;
  @Column({ type: 'varchar', length: 512 }) key!: string;
  @Column({ type: 'varchar', length: 1024, nullable: true }) url!:
    | string
    | null;
  @Column({ type: 'boolean', default: false }) isPrimary!: boolean;
  @Column({ type: 'int', default: 0 }) order!: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) altText!:
    | string
    | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

// SQLite-compatible TrekTag entity
@Entity({ name: 'trek_tags' })
class SqliteTrekTag {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120, unique: true }) name!: string;
  @Column({ type: 'int', default: 0 }) usageCount!: number;
}

// SQLite-compatible TrekReview entity
@Entity({ name: 'trek_reviews' })
class SqliteTrekReview {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteTrek, { onDelete: 'CASCADE' }) trek!: SqliteTrek;
  @ManyToOne(() => SqliteUser, { nullable: false }) user!: SqliteUser;
  @Column({ type: 'int' }) rating!: number;
  @Column({ type: 'text', nullable: true }) comment!: string | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

// SQLite-compatible TrekInteraction entity
@Entity({ name: 'trek_interactions' })
class SqliteTrekInteraction {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => SqliteTrek, { nullable: false, onDelete: 'CASCADE' })
  trek!: SqliteTrek;
  @ManyToOne(() => SqliteUser, { nullable: false }) user!: SqliteUser;
  @Column({ type: 'varchar' }) type!: string;
  @Column({ type: 'int', default: 1 }) weight!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

let organizerEmailIndex = 0;

describe('BookingsService integration (sqlite)', () => {
  let dataSource: DataSource;
  let service: BookingsService;
  let trekRepo: Repository<SqliteTrek>;
  let bookingRepo: Repository<SqliteBooking>;
  let userRepo: Repository<SqliteUser>;
  let paymentRepo: Repository<SqlitePayment>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        SqliteUser,
        SqliteTrek,
        SqliteTrekImage,
        SqliteTrekTag,
        SqliteTrekReview,
        SqliteTrekInteraction,
        SqliteBooking,
        SqlitePayment,
      ],
    });
    await dataSource.initialize();

    trekRepo = dataSource.getRepository(SqliteTrek);
    bookingRepo = dataSource.getRepository(SqliteBooking);
    userRepo = dataSource.getRepository(SqliteUser);
    paymentRepo = dataSource.getRepository(SqlitePayment);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  const buildService = () => {
    const settingsService = {
      getSettings: async () => ({ holdWindowMinutes: 15 }),
    } as any;

    const ticketService = new TicketService({
      signAsync: jest.fn().mockResolvedValue('signed-ticket-token'),
      verifyAsync: jest.fn(),
    } as unknown as JwtService);

    const mailerService = { sendBookingCancellationEmail: jest.fn() } as any;
    const notificationsService = {} as any;

    return new BookingsService(
      bookingRepo as any,
      trekRepo as any,
      paymentRepo as any,
      settingsService,
      ticketService,
      dataSource,
      notificationsService,
      mailerService,
    );
  };

  test('findByUser should return paginated bookings', async () => {
    service = buildService();

    organizerEmailIndex = organizerEmailIndex + 1;
    const organizer = userRepo.create({
      email: `org${organizerEmailIndex}@test.com`,
      passwordHash: 'hash',
      organizerStatus: 'APPROVED',
      isOrganizerActive: true,
    });
    await userRepo.save(organizer);

    const trek = trekRepo.create({
      name: `Trek-${Date.now()}`,
      maxParticipants: 10,
      costInr: 500,
      isPublished: true,
      organizer,
      startDate: new Date(new Date().getTime() + 86400000),
    } as any);
    await trekRepo.save(trek);

    const userId = 'test-user';
    for (let i = 0; i < 3; i++) {
      const booking = bookingRepo.create({
        trekId: trek.id,
        userId,
        quantity: 1,
        unitPriceInr: 500,
        totalAmountInr: 500,
        status: BookingStatus.PENDING,
        trekSnapshot: { id: trek.id, name: trek.name },
      } as any);
      await bookingRepo.save(booking);
    }

    const result = await service.findByUser(userId, { page: 1, limit: 2 });
    expect(result.data.length).toBe(2);
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(2);
  });

  test('findOne should return booking owned by user', async () => {
    service = buildService();

    const booking = bookingRepo.create({
      trekId: 'some-trek-id',
      userId: 'owner',
      quantity: 1,
      unitPriceInr: 100,
      totalAmountInr: 100,
      status: BookingStatus.PENDING,
      trekSnapshot: { id: 'trek-1', name: 'Test' },
    } as any);
    await bookingRepo.save(booking);

    const found = await service.findOne(booking.id, 'owner');
    expect(found).toBeDefined();
    expect(found.id).toBe(booking.id);
  });

  test('findOne should throw Forbidden for non-owner non-organizer', async () => {
    service = buildService();

    const booking = bookingRepo.create({
      trekId: 'some-trek-id',
      userId: 'owner',
      quantity: 1,
      unitPriceInr: 100,
      totalAmountInr: 100,
      status: BookingStatus.PENDING,
      trekSnapshot: { id: 'trek-1', name: 'Test' },
    } as any);
    await bookingRepo.save(booking);

    await expect(service.findOne(booking.id, 'stranger')).rejects.toThrow(
      'Access denied',
    );
  });

  test('cancelBooking should cancel a pending booking', async () => {
    service = buildService();

    const booking = bookingRepo.create({
      trekId: 'some-trek-id',
      userId: 'user-cancel',
      quantity: 1,
      unitPriceInr: 100,
      totalAmountInr: 100,
      status: BookingStatus.PENDING,
      trekSnapshot: { id: 'trek-1', name: 'Test' },
    } as any);
    await bookingRepo.save(booking);

    const result = await service.cancelBooking(booking.id, 'user-cancel');
    expect(result.booking.status).toBe(BookingStatus.CANCELLED);
    expect(result.refunded).toBe(false);
  });

  test('releaseExpiredHolds should mark expired pending bookings as FAILED', async () => {
    service = buildService();

    const expired = bookingRepo.create({
      trekId: 'some-trek-id',
      userId: 'u2',
      quantity: 1,
      unitPriceInr: 1000,
      totalAmountInr: 1000,
      status: BookingStatus.PENDING,
      holdExpiresAt: new Date(Date.now() - 1000 * 60),
      trekSnapshot: { id: 'trek-1', name: 'Test' },
    } as any);
    await bookingRepo.save(expired);

    const res = await service.releaseExpiredHolds();
    expect(res.released).toBeGreaterThanOrEqual(1);

    const reloaded = await bookingRepo.findOne({
      where: { id: expired.id } as any,
    });
    expect(reloaded!.status).toBe(BookingStatus.FAILED);
  });
});
