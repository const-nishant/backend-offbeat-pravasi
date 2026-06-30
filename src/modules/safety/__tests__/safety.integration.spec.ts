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
  Index,
} from 'typeorm';
import { SafetyService } from '../safety.service';
import { CheckInStatus } from '../enums/check-in-status.enum';
import {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
  beforeEach,
} from '@jest/globals';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

jest.mock('../../notifications/notifications.service', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    sendPushToUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

// --- SQLite-compatible entities ---

@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) fullName?: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) username?: string;
  @Column({ type: 'boolean', default: false }) isAdmin!: boolean;
  @Column({ type: 'varchar', length: 32, nullable: true }) organizerStatus?: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'treks' })
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ type: 'uuid', nullable: true }) organizerId?: string;
  @ManyToOne(() => SqliteUser, { nullable: true })
  @JoinColumn({ name: 'organizerId' })
  organizer?: SqliteUser;
  @Column({ type: 'datetime', nullable: true }) startDate?: Date;
  @Column({ type: 'datetime', nullable: true }) endDate?: Date;
  @Column({ type: 'int', default: 0 }) costInr!: number;
  @Column({ type: 'varchar', length: 32, default: 'MODERATE' }) difficulty!: string;
  @Column({ type: 'varchar', length: 32, default: 'PUBLISHED' }) status!: string;
  @Column({ type: 'boolean', default: true }) isPublished!: boolean;
  @Column({ type: 'float', nullable: true }) latitude?: number;
  @Column({ type: 'float', nullable: true }) longitude?: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) location?: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'bookings' })
@Index(['trekId', 'status'])
class SqliteBooking {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') trekId!: string;
  @Column({ type: 'simple-json', nullable: false }) trekSnapshot!: any;
  @Column('uuid') userId!: string;
  @Column({ type: 'simple-json', nullable: true }) participants?: any[];
  @Column('int') quantity!: number;
  @Column('int') unitPriceInr!: number;
  @Column('int') totalAmountInr!: number;
  @Column({ type: 'varchar', length: 32, default: 'PENDING' }) status!: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'trek_safety_info' })
class SqliteTrekSafetyInfo {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') trekId!: string;
  @OneToOne(() => SqliteTrek, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trekId' })
  trek!: SqliteTrek;
  @Column({ type: 'text', nullable: true }) terrainRisks?: string;
  @Column({ type: 'text', nullable: true }) altitudeWarnings?: string;
  @Column({ type: 'text', nullable: true }) wildlifeAdvisories?: string;
  @Column({ type: 'text', nullable: true }) generalGuidelines?: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) baseCampContact?: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) localRescueContact?: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) nearestHospital?: string;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'user_emergency_contacts' })
@Index(['userId'])
class SqliteEmergencyContact {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') userId!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'varchar', length: 20 }) phone!: string;
  @Column({ type: 'varchar', length: 40 }) relationship!: string;
  @Column({ type: 'boolean', default: false }) isPrimary!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

@Entity({ name: 'trek_check_ins' })
@Index(['status', 'expectedCheckOutAt'])
@Index(['userId'])
class SqliteTrekCheckIn {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') bookingId!: string;
  @OneToOne(() => SqliteBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking!: SqliteBooking;
  @Column('uuid') userId!: string;
  @ManyToOne(() => SqliteUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: SqliteUser;
  @Column({ type: 'datetime' }) checkedInAt!: Date;
  @Column({ type: 'datetime' }) expectedCheckOutAt!: Date;
  @Column({ type: 'datetime', nullable: true }) checkedOutAt?: Date;
  @Column({ type: 'varchar', length: 16, default: 'ACTIVE' }) status!: string;
  @Column({ type: 'datetime', nullable: true }) escalatedAt?: Date;
  @Column({ type: 'datetime', nullable: true }) resolvedAt?: Date;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

describe('Safety Integration — SQLite', () => {
  let dataSource: DataSource;
  let safetyInfoRepo: Repository<SqliteTrekSafetyInfo>;
  let emergencyContactRepo: Repository<SqliteEmergencyContact>;
  let checkInRepo: Repository<SqliteTrekCheckIn>;
  let trekRepo: Repository<SqliteTrek>;
  let bookingRepo: Repository<SqliteBooking>;
  let userRepo: Repository<SqliteUser>;
  let service: SafetyService;

  let organizer: SqliteUser;
  let trek: SqliteTrek;
  let booking: SqliteBooking;

  async function createOrganizer(): Promise<SqliteUser> {
    return userRepo.save({ email: 'org@test.com', fullName: 'Organizer' } as any);
  }

  async function createTrek(org: SqliteUser): Promise<SqliteTrek> {
    return trekRepo.save({
      name: 'Integration Test Trek',
      organizerId: org.id,
      startDate: new Date('2026-08-01T06:00:00Z'),
      endDate: new Date('2026-08-03T18:00:00Z'),
      costInr: 5000,
      isPublished: true,
    } as any);
  }

  async function createBooking(
    trk: SqliteTrek,
    usr: SqliteUser,
  ): Promise<SqliteBooking> {
    return bookingRepo.save({
      trekId: trk.id,
      userId: usr.id,
      trekSnapshot: { name: trk.name },
      quantity: 1,
      unitPriceInr: 5000,
      totalAmountInr: 5000,
      status: 'CONFIRMED',
    } as any);
  }

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        SqliteUser,
        SqliteTrek,
        SqliteBooking,
        SqliteTrekSafetyInfo,
        SqliteEmergencyContact,
        SqliteTrekCheckIn,
      ],
    });
    await dataSource.initialize();

    safetyInfoRepo = dataSource.getRepository(SqliteTrekSafetyInfo);
    emergencyContactRepo = dataSource.getRepository(SqliteEmergencyContact);
    checkInRepo = dataSource.getRepository(SqliteTrekCheckIn);
    trekRepo = dataSource.getRepository(SqliteTrek);
    bookingRepo = dataSource.getRepository(SqliteBooking);
    userRepo = dataSource.getRepository(SqliteUser);

    service = new SafetyService(
      safetyInfoRepo as any,
      emergencyContactRepo as any,
      checkInRepo as any,
      trekRepo as any,
      bookingRepo as any,
      dataSource as any,
      new (jest.requireMock('../../notifications/notifications.service').NotificationsService)(),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    organizer = await createOrganizer();
    trek = await createTrek(organizer);
    booking = await createBooking(trek, organizer);
  });

  /* ── Trek Safety Info ── */

  test('should create and retrieve trek safety info', async () => {
    const created = await service.upsertTrekSafety(trek.id, organizer.id, {
      terrainRisks: 'Loose rocks on summit trail',
      altitudeWarnings: 'AMS risk above 4000m',
    });
    expect(created.trekId).toBe(trek.id);
    expect(created.terrainRisks).toBe('Loose rocks on summit trail');

    const found = await service.getTrekSafety(trek.id);
    expect(found).not.toBeNull();
    expect(found!.terrainRisks).toBe('Loose rocks on summit trail');
  });

  test('should update existing trek safety info', async () => {
    await service.upsertTrekSafety(trek.id, organizer.id, {
      terrainRisks: 'Initial',
    });
    await service.upsertTrekSafety(trek.id, organizer.id, {
      terrainRisks: 'Updated',
    });
    const found = await service.getTrekSafety(trek.id);
    expect(found!.terrainRisks).toBe('Updated');
  });

  test('should return null for non-existent trek safety info', async () => {
    const result = await service.getTrekSafety('non-existent-id');
    expect(result).toBeNull();
  });

  /* ── Emergency Contacts ── */

  test('should add and list emergency contacts', async () => {
    const c1 = await service.addContact(organizer.id, {
      name: 'Emergency Person',
      phone: '+911234567890',
      relationship: 'Spouse',
      isPrimary: true,
    });
    expect(c1.name).toBe('Emergency Person');
    expect(c1.isPrimary).toBe(true);

    const c2 = await service.addContact(organizer.id, {
      name: 'Backup Person',
      phone: '+919876543210',
      relationship: 'Mother',
    });
    expect(c2.isPrimary).toBe(false);

    const contacts = await service.getUserContacts(organizer.id);
    expect(contacts).toHaveLength(2);
    expect(contacts[0].isPrimary).toBe(true);
  });

  test('should demote previous primary when new primary is added', async () => {
    await service.addContact(organizer.id, {
      name: 'First Primary',
      phone: '+911111111111',
      relationship: 'Spouse',
      isPrimary: true,
    });
    await service.addContact(organizer.id, {
      name: 'Second Primary',
      phone: '+912222222222',
      relationship: 'Mother',
      isPrimary: true,
    });

    const contacts = await service.getUserContacts(organizer.id);
    const primaries = contacts.filter((c) => c.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].name).toBe('Second Primary');
  });

  test('should update and delete emergency contacts', async () => {
    const c = await service.addContact(organizer.id, {
      name: 'Test Person',
      phone: '+911234567890',
      relationship: 'Friend',
    });

    const updated = await service.updateContact(c.id, organizer.id, {
      name: 'Updated Person',
      relationship: 'Family',
    });
    expect(updated.name).toBe('Updated Person');

    await service.deleteContact(c.id, organizer.id);
    const contacts = await service.getUserContacts(organizer.id);
    expect(contacts).toHaveLength(0);
  });

  test('should return primary contact', async () => {
    await service.addContact(organizer.id, {
      name: 'Primary',
      phone: '+911234567890',
      relationship: 'Spouse',
      isPrimary: true,
    });
    const primary = await service.getPrimaryContact(organizer.id);
    expect(primary).not.toBeNull();
    expect(primary!.name).toBe('Primary');
  });

  test('should return null when no primary contact', async () => {
    const primary = await service.getPrimaryContact(organizer.id);
    expect(primary).toBeNull();
  });

  /* ── Check-in / Check-out ── */

  test('should check in and check out successfully', async () => {
    const checkIn = await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    expect(checkIn.status).toBe(CheckInStatus.ACTIVE);
    expect(checkIn.bookingId).toBe(booking.id);

    const checkOut = await service.checkOut(booking.id, organizer.id);
    expect(checkOut.status).toBe(CheckInStatus.COMPLETED);
    expect(checkOut.checkedOutAt).toBeDefined();
  });

  test('should get check-in status', async () => {
    await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    const status = await service.getCheckInStatus(booking.id, organizer.id);
    expect(status).not.toBeNull();
    expect(status!.status).toBe(CheckInStatus.ACTIVE);
  });

  test('should return null for non-existent check-in status', async () => {
    const status = await service.getCheckInStatus('non-existent', organizer.id);
    expect(status).toBeNull();
  });

  test('should not allow duplicate check-in', async () => {
    await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    await expect(
      service.checkIn(booking.id, organizer.id, {
        latitude: 27.5,
        longitude: 78.0,
      }),
    ).rejects.toThrow();
  });

  test('should acknowledge safety during active check-in', async () => {
    const checkIn = await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    const ack = await service.acknowledge(checkIn.id, organizer.id);
    expect(ack.status).toBe(CheckInStatus.RESOLVED);
  });

  test('should not allow check-out on already completed check-in', async () => {
    await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    await service.checkOut(booking.id, organizer.id);
    await expect(
      service.checkOut(booking.id, organizer.id),
    ).rejects.toThrow();
  });

  test('should not allow acknowledge on already completed check-in', async () => {
    const checkIn = await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    await service.checkOut(booking.id, organizer.id);
    await expect(
      service.acknowledge(checkIn.id, organizer.id),
    ).rejects.toThrow();
  });

  test('should escalate missed check-out', async () => {
    const checkIn = await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    await service.escalateMissedCheckout(checkIn.id);
    const status = await service.getCheckInStatus(booking.id, organizer.id);
    expect(status!.status).toBe(CheckInStatus.ESCALATED);
  });

  test('should resolve after escalation via acknowledge', async () => {
    const checkIn = await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    await service.escalateMissedCheckout(checkIn.id);
    const ack = await service.acknowledge(checkIn.id, organizer.id);
    expect(ack.status).toBe(CheckInStatus.RESOLVED);
  });

  test('should handle missing check-in for escalation gracefully', async () => {
    await service.escalateMissedCheckout('non-existent-id');
    await service.escalateEmergency('non-existent-id');
  });

  test('should use trek endDate as expectedCheckOutAt', async () => {
    const checkIn = await service.checkIn(booking.id, organizer.id, {
      latitude: 27.5,
      longitude: 78.0,
    });
    const expectedMs = checkIn.expectedCheckOutAt.getTime();
    const endMs = trek.endDate!.getTime();
    expect(expectedMs).toBe(endMs);
  });

  /* ── Organizer ownership ── */

  test('should reject safety info upsert from non-organizer', async () => {
    await expect(
      service.upsertTrekSafety(trek.id, 'hacker-id', {
        terrainRisks: 'Hacked',
      }),
    ).rejects.toThrow();
  });

  test('should reject check-in on booking belonging to another user', async () => {
    await expect(
      service.checkIn(booking.id, 'hacker-id', {
        latitude: 27.5,
        longitude: 78.0,
      }),
    ).rejects.toThrow();
  });
});
