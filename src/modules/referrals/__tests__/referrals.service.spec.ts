import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ReferralService } from '../referrals.service';
import { ReferralCode } from '../entities/referral-code.entity';
import { Referral } from '../entities/referral.entity';
import { ReferralTierConfig } from '../entities/referral-tier-config.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

describe('ReferralService', () => {
  let service: ReferralService;
  let codeRepo: jest.Mocked<Repository<ReferralCode>>;
  let referralRepo: jest.Mocked<Repository<Referral>>;
  let tierConfigRepo: jest.Mocked<Repository<ReferralTierConfig>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUser = {
    id: 'user-1',
    email: 'referrer@test.com',
    fullName: 'Referrer User',
    userPoints: 0,
  } as unknown as User;

  const mockCode = {
    id: 'code-1',
    userId: 'user-1',
    code: 'ABC123',
    tier: 'BASE',
    totalReferrals: 0,
    successfulReferrals: 0,
    totalEarnedInr: 0,
    createdAt: new Date(),
  } as unknown as ReferralCode;

  const mockTierConfig = {
    id: 'tier-1',
    tier: 'BASE',
    minSuccessfulReferrals: 0,
    rewardPerReferralInr: 200,
    refereeDiscountInr: 300,
  } as unknown as ReferralTierConfig;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: getRepositoryToken(ReferralCode),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Referral),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReferralTierConfig),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findByIds: jest.fn(),
            increment: jest.fn(),
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

    service = module.get<ReferralService>(ReferralService);
    codeRepo = module.get(getRepositoryToken(ReferralCode));
    referralRepo = module.get(getRepositoryToken(Referral));
    tierConfigRepo = module.get(getRepositoryToken(ReferralTierConfig));
    userRepo = module.get(getRepositoryToken(User));
    notificationsService = module.get(NotificationsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrGenerateCode', () => {
    it('should return existing code', async () => {
      codeRepo.findOne.mockResolvedValue(mockCode);

      const result = await service.getOrGenerateCode('user-1');

      expect(result.code).toBe('ABC123');
      expect(codeRepo.create).not.toHaveBeenCalled();
    });

    it('should generate new code if none exists', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(mockUser);
      codeRepo.create.mockReturnValue(mockCode);
      codeRepo.save.mockResolvedValue(mockCode);

      const result = await service.getOrGenerateCode('user-2');

      expect(result.code).toBe('ABC123');
      expect(codeRepo.create).toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getOrGenerateCode('bad-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyReferrals', () => {
    it('should return referrals for user with code', async () => {
      codeRepo.findOne.mockResolvedValue(mockCode);
      referralRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getMyReferrals('user-1');

      expect(result.meta.total).toBe(0);
    });

    it('should return empty if user has no code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyReferrals('user-1');

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getCodeInfo', () => {
    it('should return referral info for valid code', async () => {
      codeRepo.findOne.mockResolvedValue(mockCode);
      userRepo.findOne.mockResolvedValue(mockUser);
      tierConfigRepo.findOne.mockResolvedValue(mockTierConfig);

      const result = await service.getCodeInfo('ABC123');

      expect(result.referrerName).toBe('Referrer User');
      expect(result.discountAmount).toBe(300);
    });

    it('should throw for invalid code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      await expect(service.getCodeInfo('BAD')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('claimReferral', () => {
    it('should claim a referral for a new user', async () => {
      codeRepo.findOne.mockResolvedValue(mockCode);
      userRepo.findOne.mockResolvedValue(mockUser);
      referralRepo.findOne.mockResolvedValue(null);
      referralRepo.create.mockReturnValue({
        id: 'ref-1',
        referrerCodeId: 'code-1',
        refereeUserId: 'user-2',
        refereeEmail: 'new@test.com',
        status: 'PENDING',
      } as unknown as Referral);
      referralRepo.save.mockResolvedValue({
        id: 'ref-1',
        referrerCodeId: 'code-1',
        refereeUserId: 'user-2',
        status: 'PENDING',
      } as unknown as Referral);

      const mockReferee = {
        ...mockUser,
        id: 'user-2',
        email: 'new@test.com',
      } as unknown as User;
      userRepo.findOne.mockResolvedValue(mockReferee);

      const result = await service.claimReferral('ABC123', 'user-2');

      expect(result.status).toBe('PENDING');
    });

    it('should throw when referring self', async () => {
      codeRepo.findOne.mockResolvedValue(mockCode);
      const selfUser = { ...mockUser, id: 'user-1' } as unknown as User;
      userRepo.findOne.mockResolvedValue(selfUser);

      await expect(service.claimReferral('ABC123', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw for invalid code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReferral('BAD', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('onBookingCompleted', () => {
    it('should process booking completion and deliver reward', async () => {
      const mockReferral = {
        id: 'ref-1',
        referrerCodeId: 'code-1',
        refereeUserId: 'user-2',
        status: 'PENDING',
      } as unknown as Referral;

      referralRepo.findOne.mockResolvedValue(mockReferral);
      referralRepo.save.mockResolvedValue({
        ...mockReferral,
        status: 'COMPLETED',
      } as unknown as Referral);

      codeRepo.findOne.mockResolvedValue(mockCode);
      tierConfigRepo.findOne.mockResolvedValue(mockTierConfig);
      tierConfigRepo.find.mockResolvedValue([mockTierConfig]);
      codeRepo.save.mockResolvedValue(mockCode);

      await service.onBookingCompleted('user-2');

      expect(referralRepo.save).toHaveBeenCalled();
      expect(userRepo.increment).toHaveBeenCalledWith(
        { id: 'user-1' },
        'userPoints',
        200,
      );
    });

    it('should skip if no pending referral', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await service.onBookingCompleted('unknown-user');

      expect(referralRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('should return top referrers', async () => {
      codeRepo.find.mockResolvedValue([mockCode]);
      (userRepo.findByIds as jest.Mock).mockResolvedValue([mockUser]);

      const result = await service.getLeaderboard();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Referrer User');
    });

    it('should return empty if no codes', async () => {
      codeRepo.find.mockResolvedValue([]);

      const result = await service.getLeaderboard();

      expect(result).toHaveLength(0);
    });
  });
});
