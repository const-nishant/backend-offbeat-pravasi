import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GroupsService } from '../groups.service';
import { TrekGroup } from '../entities/trek-group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepo: jest.Mocked<Repository<TrekGroup>>;
  let memberRepo: jest.Mocked<Repository<GroupMember>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let dataSource: jest.Mocked<DataSource>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockTrek = {
    id: 'trek-1', name: 'Test Trek', costInr: 5000,
    maxParticipants: 20, currentParticipants: 0,
  } as unknown as Trek;

  const mockGroup = {
    id: 'group-1', trekId: 'trek-1', leadUserId: 'user-1',
    name: 'Test Group', maxSize: 5,
    expiresAt: new Date('2099-12-31'), status: GroupStatus.OPEN,
    shareCode: 'ABC123', createdAt: new Date(), updatedAt: new Date(),
  } as unknown as TrekGroup;

  function createMockMember(overrides: Partial<GroupMember> = {}): GroupMember {
    return {
      id: 'member-1', groupId: 'group-1', userId: 'user-2',
      email: 'member@test.com', status: MemberStatus.JOINED,
      fullName: 'Member User', phone: '+911234567890',
      emergencyContact: null, medicalConditions: null,
      joinedAt: new Date(), createdAt: new Date(),
      ...overrides,
    } as unknown as GroupMember;
  }

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
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendPushToUser: jest.fn().mockResolvedValue(undefined),
          },
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a group successfully', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      groupRepo.create.mockReturnValue(mockGroup);
      groupRepo.save.mockResolvedValue(mockGroup);

      const result = await service.create('user-1', {
        trekId: 'trek-1', maxSize: 5, expiresAt: '2099-12-31T00:00:00Z',
      });

      expect(result.id).toBe('group-1');
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ trekId: 'trek-1', leadUserId: 'user-1', maxSize: 5 }),
      );
    });

    it('should throw when trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);

      await expect(service.create('user-1', {
        trekId: 'bad-trek', maxSize: 5, expiresAt: '2099-12-31T00:00:00Z',
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getById', () => {
    it('should return group for lead user', async () => {
      groupRepo.findOne.mockResolvedValue({ ...mockGroup, members: [] } as unknown as TrekGroup);

      const result = await service.getById('group-1', 'user-1');

      expect(result.id).toBe('group-1');
    });

    it('should return group for member user', async () => {
      groupRepo.findOne.mockResolvedValue({
        ...mockGroup, members: [createMockMember()],
      } as unknown as TrekGroup);

      const result = await service.getById('group-1', 'user-2');

      expect(result.id).toBe('group-1');
    });

    it('should throw for non-member', async () => {
      groupRepo.findOne.mockResolvedValue({ ...mockGroup, members: [] } as unknown as TrekGroup);

      await expect(service.getById('group-1', 'stranger')).rejects.toThrow(ForbiddenException);
    });

    it('should throw for non-existent group', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.getById('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update group name', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(2);
      groupRepo.save.mockResolvedValue({ ...mockGroup, name: 'New Name' } as TrekGroup);

      const result = await service.update('group-1', 'user-1', { name: 'New Name' });

      expect(result).toBeDefined();
    });

    it('should throw when maxSize < joined members', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(4);

      await expect(service.update('group-1', 'user-1', { maxSize: 3 }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('invite', () => {
    it('should invite new members', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.count.mockResolvedValue(0);
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockReturnValue(createMockMember());
      memberRepo.save.mockResolvedValue(createMockMember());

      const result = await service.invite('group-1', 'user-1', {
        invites: [{ email: 'new@test.com' }],
      });

      expect(result).toHaveLength(1);
    });

    it('should throw if not lead', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);

      await expect(service.invite('group-1', 'user-2', {
        invites: [{ email: 'new@test.com' }],
      })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('join', () => {
    it('should join a group via share code', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne.mockResolvedValue(createMockMember({ status: MemberStatus.INVITED }));
      memberRepo.save.mockResolvedValue(createMockMember({ status: MemberStatus.JOINED }));

      const result = await service.join('ABC123', 'user-2', 'member@test.com');

      expect(result.status).toBe(MemberStatus.JOINED);
    });

    it('should throw for invalid share code', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.join('BAD', 'user-2', 'a@b.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMemberStatus', () => {
    it('should update member status to JOINED', async () => {
      memberRepo.findOne.mockResolvedValue(createMockMember({ status: MemberStatus.INVITED }));
      memberRepo.save.mockResolvedValue(createMockMember({ status: MemberStatus.JOINED }));

      const result = await service.updateMemberStatus(
        'group-1', 'member-1', 'user-2',
        { status: MemberStatus.JOINED, fullName: 'Full Name' },
      );

      expect(result.status).toBe(MemberStatus.JOINED);
    });

    it('should throw if not the member', async () => {
      memberRepo.findOne.mockResolvedValue(createMockMember({ userId: 'other-user' }));

      await expect(service.updateMemberStatus(
        'group-1', 'member-1', 'wrong-user',
        { status: MemberStatus.JOINED },
      )).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      memberRepo.findOne.mockResolvedValue(createMockMember());

      await service.removeMember('group-1', 'member-1', 'user-1');

      expect(memberRepo.remove).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a group', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup);
      groupRepo.save.mockResolvedValue({ ...mockGroup, status: GroupStatus.CANCELLED } as TrekGroup);
      memberRepo.find.mockResolvedValue([]);

      await service.cancel('group-1', 'user-1');

      expect(groupRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: GroupStatus.CANCELLED }),
      );
    });
  });

  describe('expireStaleGroups', () => {
    it('should expire stale groups', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      (groupRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const count = await service.expireStaleGroups();

      expect(count).toBe(3);
    });
  });

  describe('bookForGroup', () => {
    it('should throw if not lead', async () => {
      groupRepo.findOne.mockResolvedValue({ ...mockGroup, members: [] } as unknown as TrekGroup);

      await expect(service.bookForGroup('group-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if no members joined', async () => {
      groupRepo.findOne.mockResolvedValue({ ...mockGroup, members: [] } as unknown as TrekGroup);

      await expect(service.bookForGroup('group-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
