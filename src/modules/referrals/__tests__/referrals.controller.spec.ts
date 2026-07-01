import { Test, type TestingModule } from '@nestjs/testing';
import { ReferralController } from '../referrals.controller';
import { ReferralService } from '../referrals.service';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

describe('ReferralController', () => {
  let controller: ReferralController;
  let referralService: jest.Mocked<ReferralService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@test.com',
    isAdmin: false,
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [
        {
          provide: ReferralService,
          useValue: {
            getOrGenerateCode: jest.fn(),
            getMyReferrals: jest.fn(),
            getCodeInfo: jest.fn(),
            getLeaderboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
    referralService = module.get(ReferralService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyCode', () => {
    it('should return referral code with share link', async () => {
      referralService.getOrGenerateCode.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'ABC123',
        tier: 'BASE',
        totalReferrals: 2,
        successfulReferrals: 1,
        totalEarnedInr: 200,
        createdAt: new Date(),
      } as any);

      const result = await controller.getMyCode(mockUser);

      expect(result.code).toBe('ABC123');
      expect(result.shareLink).toContain('/r/ABC123');
      expect(result.tier).toBe('BASE');
    });
  });

  describe('generate', () => {
    it('should generate or fetch existing code', async () => {
      referralService.getOrGenerateCode.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'NEW123',
        tier: 'BASE',
        totalReferrals: 0,
        successfulReferrals: 0,
        totalEarnedInr: 0,
        createdAt: new Date(),
      } as any);

      const result = await controller.generate(mockUser);

      expect(result.code).toBe('NEW123');
      expect(referralService.getOrGenerateCode).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getMyReferrals', () => {
    it('should return paginated referrals', async () => {
      referralService.getMyReferrals.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      const result = await controller.getMyReferrals(mockUser, 1, 20);

      expect(result.meta.total).toBe(0);
      expect(referralService.getMyReferrals).toHaveBeenCalledWith('user-1', 1, 20);
    });
  });

  describe('leaderboard', () => {
    it('should return leaderboard', async () => {
      referralService.getLeaderboard.mockResolvedValue([
        { userId: 'u1', name: 'Top Referrer', successfulReferrals: 10 },
      ]);

      const result = await controller.leaderboard(5);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Top Referrer');
    });
  });

  describe('claimInfo', () => {
    it('should return referral info for a code', async () => {
      referralService.getCodeInfo.mockResolvedValue({
        referrerName: 'Referrer',
        discountAmount: 500,
        code: 'ABC123',
      });

      const result = await controller.claimInfo('ABC123');

      expect(result.discountAmount).toBe(500);
      expect(referralService.getCodeInfo).toHaveBeenCalledWith('ABC123');
    });
  });
});
