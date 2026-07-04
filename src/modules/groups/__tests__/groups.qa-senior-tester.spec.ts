import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { GroupsService } from '../groups.service';
import { TrekGroup } from '../entities/trek-group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

describe('GroupsService — Senior QA Review', () => {
  let service: GroupsService;
  let groupRepo: jest.Mocked<Repository<TrekGroup>>;
  let memberRepo: jest.Mocked<Repository<GroupMember>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let dataSource: jest.Mocked<DataSource>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockTrek = {
    id: 'trek-1',
    name: 'Test Trek',
    costInr: 5000,
    maxParticipants: 20,
    currentParticipants: 5,
  } as unknown as Trek;

  const mockGroup = {
    id: 'group-1',
    trekId: 'trek-1',
    leadUserId: 'user-lead',
    name: 'Test Group',
    maxSize: 5,
    expiresAt: new Date('2099-12-31'),
    status: GroupStatus.OPEN,
    shareCode: 'ABC123DEF456',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as TrekGroup;

  function createMockMember(overrides: Partial<GroupMember> = {}): GroupMember {
    return {
      id: 'member-1',
      groupId: 'group-1',
      userId: 'user-member',
      email: 'member@test.com',
      status: MemberStatus.JOINED,
      fullName: 'Member User',
      phone: '+911234567890',
      emergencyContact: null,
      medicalConditions: null,
      joinedAt: new Date(),
      createdAt: new Date(),
      ...overrides,
    } as unknown as GroupMember;
  }

  let mockQueryRunner: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(TrekGroup),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Trek),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { sendPushToUser: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepo = module.get(getRepositoryToken(TrekGroup));
    memberRepo = module.get(getRepositoryToken(GroupMember));
    trekRepo = module.get(getRepositoryToken(Trek));
    bookingRepo = module.get(getRepositoryToken(Booking));
    dataSource = module.get(DataSource);
    notificationsService = module.get(NotificationsService);

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      },
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── STATE MACHINE: GROUP STATUS TRANSITIONS ─────────────────────────

  describe('1. Group status state machine', () => {
    const NON_OPEN_STATUSES = [
      GroupStatus.BOOKED,
      GroupStatus.EXPIRED,
      GroupStatus.CANCELLED,
    ];

    for (const status of NON_OPEN_STATUSES) {
      it(`should reject invite when group is ${status}`, async () => {
        groupRepo.findOne.mockResolvedValue({
          ...mockGroup,
          status,
        } as TrekGroup);

        await expect(
          service.invite('group-1', 'user-lead', {
            invites: [{ email: 'a@b.com' }],
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it(`should reject update when group is ${status}`, async () => {
        groupRepo.findOne.mockResolvedValue({
          ...mockGroup,
          status,
        } as TrekGroup);

        await expect(
          service.update('group-1', 'user-lead', { name: 'X' }),
        ).rejects.toThrow(BadRequestException);
      });

      it(`should reject join when group is ${status}`, async () => {
        groupRepo.findOne.mockResolvedValue({
          ...mockGroup,
          status,
        } as TrekGroup);

        await expect(
          service.join('ABC123DEF456', 'user-x', 'x@y.com'),
        ).rejects.toThrow(BadRequestException);
      });

      it(`should reject book when group is ${status}`, async () => {
        groupRepo.findOne.mockResolvedValue({
          ...mockGroup,
          status,
          members: [],
        } as any);

        await expect(
          service.bookForGroup('group-1', 'user-lead'),
        ).rejects.toThrow(BadRequestException);
      });
    }
  });

  // ─── DUPLICATE PREVENTION ────────────────────────────────────────────

  describe('2. Duplicate prevention', () => {
    it('should reject duplicate email invite', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(1);
      // Existing member with same email, already INVITED → should skip (not re-create)
      memberRepo.findOne.mockResolvedValue(
        createMockMember({
          email: 'dup@test.com',
          status: MemberStatus.INVITED,
        }),
      );

      const result = await service.invite('group-1', 'user-lead', {
        invites: [{ email: 'dup@test.com' }],
      });

      // Should not create a duplicate
      expect(result).toHaveLength(0);
      expect(memberRepo.create).not.toHaveBeenCalled();
    });

    it('should reject joining again after already JOINED', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne.mockResolvedValue(
        createMockMember({ status: MemberStatus.JOINED }),
      );

      await expect(
        service.join('ABC123DEF456', 'user-member', 'member@test.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject joining if previously DECLINED', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne.mockResolvedValue(
        createMockMember({ status: MemberStatus.DECLINED }),
      );

      await expect(
        service.join('ABC123DEF456', 'user-member', 'member@test.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow re-inviting a DECLINED member', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(1);
      const declined = createMockMember({
        email: 'prev@test.com',
        status: MemberStatus.DECLINED,
      });
      memberRepo.findOne.mockResolvedValue(declined);
      memberRepo.save.mockResolvedValue({
        ...declined,
        status: MemberStatus.INVITED,
      });

      const result = await service.invite('group-1', 'user-lead', {
        invites: [{ email: 'prev@test.com' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(MemberStatus.INVITED);
      expect(memberRepo.save).toHaveBeenCalled();
    });

    it('should reject duplicate updateMemberStatus (already JOINED)', async () => {
      memberRepo.findOne.mockResolvedValue(
        createMockMember({ status: MemberStatus.JOINED }),
      );
      memberRepo.save.mockResolvedValue(
        createMockMember({ status: MemberStatus.JOINED }),
      );

      const result = await service.updateMemberStatus(
        'group-1',
        'member-1',
        'user-member',
        {
          status: MemberStatus.JOINED,
        },
      );

      // Should succeed (idempotent) — no error, just saves again
      expect(result.status).toBe(MemberStatus.JOINED);
    });
  });

  // ─── EXPIRED GROUP REJECTION ─────────────────────────────────────────

  describe('3. Expired group rejection', () => {
    const expiredGroup = {
      ...mockGroup,
      expiresAt: new Date('2020-01-01'),
    } as TrekGroup;

    it('should reject join on expired group', async () => {
      groupRepo.findOne.mockResolvedValue(expiredGroup);

      await expect(service.join('ABC123', 'user-x', 'x@y.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject book on expired group', async () => {
      groupRepo.findOne.mockResolvedValue({
        ...expiredGroup,
        members: [],
      } as any);

      await expect(
        service.bookForGroup('group-1', 'user-lead'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── CAPACITY EDGE CASES ─────────────────────────────────────────────

  describe('4. Capacity edge cases', () => {
    it('should allow invite exactly at maxSize', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(4); // 4 current → 1 more fits maxSize=5
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockReturnValue(
        createMockMember({ email: 'last@test.com' }),
      );
      memberRepo.save.mockResolvedValue(
        createMockMember({ email: 'last@test.com' }),
      );

      const result = await service.invite('group-1', 'user-lead', {
        invites: [{ email: 'last@test.com' }],
      });

      expect(result).toHaveLength(1);
    });

    it('should reject invite exceeding maxSize', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(5); // already at maxSize=5

      await expect(
        service.invite('group-1', 'user-lead', {
          invites: [{ email: 'extra@test.com' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject update maxSize below current joined count', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(4);

      await expect(
        service.update('group-1', 'user-lead', { maxSize: 3 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── SHARE CODE ──────────────────────────────────────────────────────

  describe('5. Share code', () => {
    it('should generate a 12-character share code on create', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      groupRepo.create.mockImplementation(
        (data: any) =>
          ({
            ...mockGroup,
            ...data,
          }) as any,
      );
      groupRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.create('user-lead', {
        trekId: 'trek-1',
        maxSize: 5,
        expiresAt: '2099-12-31T00:00:00Z',
      });

      expect(result.shareCode).toHaveLength(12);
      expect(result.shareCode).toMatch(/^[A-F0-9]{12}$/);
    });

    it('should use default group name when name not provided', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      groupRepo.create.mockImplementation(
        (data: any) =>
          ({
            ...mockGroup,
            ...data,
          }) as any,
      );
      groupRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      const result = await service.create('user-lead', {
        trekId: 'trek-1',
        maxSize: 5,
        expiresAt: '2099-12-31T00:00:00Z',
      });

      expect(result.name).toBe('Test Trek Group');
    });
  });

  // ─── JOIN EDGE CASES ─────────────────────────────────────────────────

  describe('6. Join edge cases', () => {
    it('should fallback to userId lookup when email not found', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne
        .mockResolvedValueOnce(null) // email not found
        .mockResolvedValueOnce(
          createMockMember({
            status: MemberStatus.INVITED,
            userId: 'user-byid',
          }),
        ); // userId found
      memberRepo.save.mockResolvedValue(
        createMockMember({ status: MemberStatus.JOINED, userId: 'user-byid' }),
      );

      const result = await service.join(
        'ABC123DEF456',
        'user-byid',
        'unused@test.com',
      );

      expect(result.status).toBe(MemberStatus.JOINED);
    });

    it('should throw when no invitation exists (email + userId both not found)', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.join('ABC123DEF456', 'stranger', 'stranger@test.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── NON-LEAD AUTHORIZATION ──────────────────────────────────────────

  describe('7. Authorization — non-lead operations', () => {
    it('should reject non-lead update', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);

      await expect(
        service.update('group-1', 'not-lead', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-lead invite', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);

      await expect(
        service.invite('group-1', 'not-lead', {
          invites: [{ email: 'a@b.com' }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-lead removeMember', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);

      await expect(
        service.removeMember('group-1', 'member-1', 'not-lead'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-lead cancel', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);

      await expect(service.cancel('group-1', 'not-lead')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject non-lead book', async () => {
      groupRepo.findOne.mockResolvedValue({ ...mockGroup, members: [] } as any);

      await expect(service.bookForGroup('group-1', 'not-lead')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── BOOKING CAPACITY (PESSIMISTIC LOCK) ─────────────────────────────

  describe('8. Booking — capacity with pessimistic lock', () => {
    function setupBookForGroup(overrides: {
      joinedCount?: number;
      reservedSeats?: number;
      maxParticipants?: number;
      mockTrekOverride?: any;
    }) {
      const joined = Array.from(
        { length: overrides.joinedCount ?? 3 },
        (_, i) =>
          createMockMember({
            id: `m-${i}`,
            userId: `user-${i}`,
            email: `u${i}@t.com`,
          }),
      );

      groupRepo.findOne.mockResolvedValue({
        ...mockGroup,
        members: joined,
      } as unknown as TrekGroup);

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const mockTrekData = overrides.mockTrekOverride ?? {
        ...mockTrek,
        maxParticipants: overrides.maxParticipants ?? 20,
      };

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ reserved: overrides.reservedSeats ?? 0 }),
        getOne: jest.fn().mockResolvedValue(mockTrekData),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);
      mockQueryRunner.manager.create.mockReturnValue({ id: 'booking-1' });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 'booking-1',
        quantity: overrides.joinedCount ?? 3,
      });
      mockQueryRunner.manager.update.mockResolvedValue(undefined);

      return joined;
    }

    it('should book successfully when capacity available', async () => {
      setupBookForGroup({
        joinedCount: 3,
        reservedSeats: 5,
        maxParticipants: 20,
      });

      const booking = await service.bookForGroup('group-1', 'user-lead');

      expect(booking.id).toBe('booking-1');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should book exactly at capacity limit', async () => {
      setupBookForGroup({
        joinedCount: 5,
        reservedSeats: 15,
        maxParticipants: 20,
      });

      const booking = await service.bookForGroup('group-1', 'user-lead');

      expect(booking.id).toBe('booking-1');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject booking when capacity exceeded', async () => {
      setupBookForGroup({
        joinedCount: 6,
        reservedSeats: 15,
        maxParticipants: 20,
      });

      await expect(
        service.bookForGroup('group-1', 'user-lead'),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on any error', async () => {
      setupBookForGroup({
        joinedCount: 2,
        reservedSeats: 0,
        maxParticipants: 20,
      });
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB failure'));

      await expect(
        service.bookForGroup('group-1', 'user-lead'),
      ).rejects.toThrow('DB failure');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should always release queryRunner in finally block', async () => {
      setupBookForGroup({
        joinedCount: 2,
        reservedSeats: 0,
        maxParticipants: 20,
      });

      await service.bookForGroup('group-1', 'user-lead');

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────

  describe('9. Notification delivery', () => {
    it('should send notifications to all joined members on book', async () => {
      const joined = Array.from({ length: 2 }, (_, i) =>
        createMockMember({
          id: `m-${i}`,
          userId: `user-${i}`,
          email: `u${i}@t.com`,
        }),
      );

      groupRepo.findOne.mockResolvedValue({
        ...mockGroup,
        members: joined,
      } as any);
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ reserved: 0 }),
        getOne: jest.fn().mockResolvedValue(mockTrek),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);
      mockQueryRunner.manager.create.mockReturnValue({ id: 'booking-1' });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 'booking-1',
        quantity: 2,
      });
      mockQueryRunner.manager.update.mockResolvedValue(undefined);

      await service.bookForGroup('group-1', 'user-lead');

      expect(notificationsService.sendPushToUser).toHaveBeenCalledTimes(2);
      expect(notificationsService.sendPushToUser).toHaveBeenCalledWith(
        'user-0',
        expect.any(String),
        expect.any(String),
        NotificationType.BOOKING_CONFIRMED,
        expect.any(Object),
      );
    });

    it('should send cancellation notifications to all members with userId', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      groupRepo.save.mockResolvedValue({
        ...mockGroup,
        status: GroupStatus.CANCELLED,
      } as TrekGroup);
      memberRepo.find.mockResolvedValue([
        createMockMember({ userId: 'u1' }),
        createMockMember({ userId: 'u2' }),
      ]);

      await service.cancel('group-1', 'user-lead');

      expect(notificationsService.sendPushToUser).toHaveBeenCalledTimes(2);
    });

    it('should NOT send notification to members without userId (email-only invites)', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      groupRepo.save.mockResolvedValue({
        ...mockGroup,
        status: GroupStatus.CANCELLED,
      } as TrekGroup);
      memberRepo.find.mockResolvedValue([
        createMockMember({ userId: null }), // email-only invite, hasn't joined
        createMockMember({ userId: 'u2' }),
      ]);

      await service.cancel('group-1', 'user-lead');

      expect(notificationsService.sendPushToUser).toHaveBeenCalledTimes(1);
    });

    it('should not throw when notification fails (fire-and-forget)', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      groupRepo.save.mockResolvedValue({
        ...mockGroup,
        status: GroupStatus.CANCELLED,
      } as TrekGroup);
      memberRepo.find.mockResolvedValue([createMockMember({ userId: 'u1' })]);
      notificationsService.sendPushToUser.mockRejectedValue(
        new Error('Push failed'),
      );

      await expect(
        service.cancel('group-1', 'user-lead'),
      ).resolves.not.toThrow();
    });
  });

  // ─── NON-EXISTENT RESOURCES ──────────────────────────────────────────

  describe('10. Non-existent resources', () => {
    it('should throw NotFoundException for non-existent group on update', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('bad-id', 'user-lead', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent group on invite', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.invite('bad-id', 'user-lead', {
          invites: [{ email: 'a@b.com' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent group on removeMember', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember('bad-id', 'member-1', 'user-lead'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent member on removeMember', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember('group-1', 'bad-member', 'user-lead'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent group on cancel', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('bad-id', 'user-lead')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── MEMBER STATUS TRANSITIONS ───────────────────────────────────────

  describe('11. Member status transitions', () => {
    it('should update from INVITED to DECLINED', async () => {
      memberRepo.findOne.mockResolvedValue(
        createMockMember({ status: MemberStatus.INVITED }),
      );
      memberRepo.save.mockResolvedValue(
        createMockMember({ status: MemberStatus.DECLINED }),
      );

      const result = await service.updateMemberStatus(
        'group-1',
        'member-1',
        'user-member',
        {
          status: MemberStatus.DECLINED,
        },
      );

      expect(result.status).toBe(MemberStatus.DECLINED);
    });

    it('should set joinedAt timestamp when status changes to JOINED', async () => {
      memberRepo.findOne.mockResolvedValue(
        createMockMember({ status: MemberStatus.INVITED, joinedAt: null }),
      );
      memberRepo.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.updateMemberStatus(
        'group-1',
        'member-1',
        'user-member',
        {
          status: MemberStatus.JOINED,
        },
      );

      expect(result.status).toBe(MemberStatus.JOINED);
      expect(result.joinedAt).toBeInstanceOf(Date);
    });

    it('should update personal details regardless of status', async () => {
      memberRepo.findOne.mockResolvedValue(
        createMockMember({ status: MemberStatus.INVITED }),
      );
      memberRepo.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.updateMemberStatus(
        'group-1',
        'member-1',
        'user-member',
        {
          status: MemberStatus.JOINED,
          fullName: 'New Name',
          phone: '+911111111111',
          medicalConditions: 'Asthma',
        },
      );

      expect(result.fullName).toBe('New Name');
      expect(result.phone).toBe('+911111111111');
      expect(result.medicalConditions).toBe('Asthma');
    });
  });

  // ─── EXPIRY EDGE CASES ───────────────────────────────────────────────

  describe('12. Group expiry edge cases', () => {
    it('should expire zero groups when none are stale', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      (groupRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const count = await service.expireStaleGroups();

      expect(count).toBe(0);
    });

    it('should only expire groups with status=OPEN AND expiresAt < NOW()', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      const whereSpy = jest.fn().mockReturnThis();
      const andWhereSpy = jest.fn().mockReturnThis();
      qb.where = whereSpy;
      qb.andWhere = andWhereSpy;
      (groupRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await service.expireStaleGroups();

      expect(whereSpy).toHaveBeenCalledWith('status = :status', {
        status: GroupStatus.OPEN,
      });
      expect(andWhereSpy).toHaveBeenCalledWith('expiresAt < NOW()');
    });
  });

  // ─── BOOKING WITHOUT MEMBERS ─────────────────────────────────────────

  describe('13. Booking edge cases', () => {
    it('should throw when no members have joined', async () => {
      groupRepo.findOne.mockResolvedValue({
        ...mockGroup,
        status: GroupStatus.OPEN,
        members: [
          createMockMember({ status: MemberStatus.INVITED }),
          createMockMember({ status: MemberStatus.DECLINED }),
        ],
      } as unknown as TrekGroup);

      await expect(
        service.bookForGroup('group-1', 'user-lead'),
      ).rejects.toThrow('No members have joined the group');
    });

    it('should accept only JOINED members, ignoring INVITED/DECLINED', async () => {
      groupRepo.findOne.mockResolvedValue({
        ...mockGroup,
        status: GroupStatus.OPEN,
        members: [
          createMockMember({
            id: 'm1',
            status: MemberStatus.JOINED,
            userId: 'u1',
          }),
          createMockMember({
            id: 'm2',
            status: MemberStatus.INVITED,
            userId: null,
          }),
          createMockMember({
            id: 'm3',
            status: MemberStatus.DECLINED,
            userId: null,
          }),
        ],
      } as unknown as TrekGroup);

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ reserved: 0 }),
        getOne: jest.fn().mockResolvedValue(mockTrek),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);
      mockQueryRunner.manager.create.mockReturnValue({ id: 'booking-1' });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 'booking-1',
        quantity: 1,
      });
      mockQueryRunner.manager.update.mockResolvedValue(undefined);

      const booking = await service.bookForGroup('group-1', 'user-lead');

      expect(booking).toBeDefined();
      // Only 1 JOINED member → quantity should be 1
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Booking,
        expect.objectContaining({ quantity: 1 }),
      );
    });

    it('should set totalAmountInr = unitPrice * quantity', async () => {
      groupRepo.findOne.mockResolvedValue({
        ...mockGroup,
        status: GroupStatus.OPEN,
        members: [
          createMockMember({ id: 'm1', status: MemberStatus.JOINED }),
          createMockMember({ id: 'm2', status: MemberStatus.JOINED }),
        ],
      } as unknown as TrekGroup);

      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      const qb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ reserved: 0 }),
        getOne: jest.fn().mockResolvedValue(mockTrek),
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue(qb);
      mockQueryRunner.manager.create.mockImplementation(
        (_entity: any, data: any) => data,
      );
      mockQueryRunner.manager.save.mockImplementation(
        (_entity: any, data: any) => Promise.resolve(data ?? _entity),
      );
      mockQueryRunner.manager.update.mockResolvedValue(undefined);

      const booking = await service.bookForGroup('group-1', 'user-lead');

      expect(booking.quantity).toBe(2);
      expect(booking.unitPriceInr).toBe(5000);
      expect(booking.totalAmountInr).toBe(10000);
      expect(booking.metadata).toEqual({ groupId: 'group-1' });
    });
  });
});
