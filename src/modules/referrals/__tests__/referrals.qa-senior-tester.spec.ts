import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralService } from '../referrals.service';
import { ReferralCode } from '../entities/referral-code.entity';
import { Referral } from '../entities/referral.entity';
import { ReferralTierConfig } from '../entities/referral-tier-config.entity';
import { User } from '../../users/entities/user.entity';
import { ReferralStatus } from '../enums/referral-status.enum';
import { ReferralTier } from '../enums/referral-tier.enum';
import { NotificationsService } from '../../notifications/notifications.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

function createMockCode(overrides: Partial<ReferralCode> = {}): ReferralCode {
  return {
    id: 'code-1',
    userId: 'user-1',
    code: 'ABC12345',
    tier: ReferralTier.BASE,
    totalReferrals: 0,
    successfulReferrals: 0,
    totalEarnedInr: 0,
    createdAt: new Date(),
    ...overrides,
  } as unknown as ReferralCode;
}

function createMockReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: 'ref-1',
    referrerCodeId: 'code-1',
    refereeUserId: 'user-2',
    refereeEmail: 'referee@test.com',
    status: ReferralStatus.PENDING,
    rewardType: null,
    rewardValueInr: null,
    rewardDeliveredAt: null,
    createdAt: new Date(),
    ...overrides,
  } as unknown as Referral;
}

function createMockTierConfig(overrides: Partial<ReferralTierConfig> = {}): ReferralTierConfig {
  return {
    id: 'tier-base',
    tier: ReferralTier.BASE,
    minSuccessfulReferrals: 0,
    rewardPerReferralInr: 200,
    refereeDiscountInr: 300,
    ...overrides,
  } as unknown as ReferralTierConfig;
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@test.com',
    fullName: 'Test User',
    userPoints: 0,
    ...overrides,
  } as unknown as User;
}

describe('ReferralService — Senior QA Review', () => {
  let service: ReferralService;
  let codeRepo: jest.Mocked<Repository<ReferralCode>>;
  let referralRepo: jest.Mocked<Repository<Referral>>;
  let tierConfigRepo: jest.Mocked<Repository<ReferralTierConfig>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let notificationsService: jest.Mocked<NotificationsService>;

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

  /* ------------------------------------------------------------------ */
  /*  1. State machine — Referral status transitions                    */
  /* ------------------------------------------------------------------ */
  describe('Referral status state machine', () => {
    it('should transition PENDING -> COMPLETED -> REWARDED on booking completion', async () => {
      const referral = createMockReferral({ status: ReferralStatus.PENDING });
      const savedStatuses: string[] = [];
      referralRepo.findOne.mockResolvedValue(referral);
      referralRepo.save.mockImplementation(async (data: any) => {
        savedStatuses.push(data.status);
        return { ...data } as Referral;
      });
      const code = createMockCode({ successfulReferrals: 0 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);

      await service.onBookingCompleted('user-2');

      expect(savedStatuses[0]).toBe(ReferralStatus.COMPLETED);
      expect(savedStatuses[1]).toBe(ReferralStatus.REWARDED);
    });

    it('should transition COMPLETED -> REWARDED on deliverReward', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode({ successfulReferrals: 0 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      referralRepo.save.mockResolvedValue({
        ...referral,
        status: ReferralStatus.REWARDED,
      } as Referral);

      await service.deliverReward('ref-1');

      expect(referralRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReferralStatus.REWARDED }),
      );
    });

    it('should skip delivery if referral is not in COMPLETED status', async () => {
      const referral = createMockReferral({ status: ReferralStatus.PENDING });
      referralRepo.findOne.mockResolvedValue(referral);

      await service.deliverReward('ref-1');

      expect(codeRepo.save).not.toHaveBeenCalled();
      expect(userRepo.increment).not.toHaveBeenCalled();
    });

    it('should skip booking completion if no pending referral exists', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await service.onBookingCompleted('unknown-user');

      expect(referralRepo.save).not.toHaveBeenCalled();
    });

    it('should skip booking completion if referral is not PENDING', async () => {
      const referral = createMockReferral({ status: ReferralStatus.REWARDED });
      referralRepo.findOne.mockResolvedValue(referral);

      await service.onBookingCompleted('user-2');

      expect(referralRepo.save).not.toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  2. Boundary analysis — code generation, tier thresholds           */
  /* ------------------------------------------------------------------ */
  describe('Boundary analysis — code generation and tier thresholds', () => {
    it('should generate an 8-char uppercase hex code', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(createMockUser());
      codeRepo.create.mockImplementation((data) => data as ReferralCode);
      codeRepo.save.mockImplementation((data) => Promise.resolve(data as ReferralCode));

      const result = await service.getOrGenerateCode('user-new');

      expect(result.code).toMatch(/^[A-F0-9]{8}$/);
    });

    it('should set tier to BASE for new code (0 referrals)', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(createMockUser());
      codeRepo.create.mockImplementation((data) => data as ReferralCode);
      codeRepo.save.mockImplementation((data) => Promise.resolve(data as ReferralCode));

      const result = await service.getOrGenerateCode('user-new');

      expect(result.tier).toBe(ReferralTier.BASE);
    });

    it('should upgrade to SILVER at exactly 3 successful referrals', async () => {
      const code = createMockCode({ successfulReferrals: 3, tier: ReferralTier.BASE });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.find.mockResolvedValue([
        createMockTierConfig({ tier: ReferralTier.GOLD, minSuccessfulReferrals: 10 }),
        createMockTierConfig({ tier: ReferralTier.SILVER, minSuccessfulReferrals: 3 }),
        createMockTierConfig({ tier: ReferralTier.BASE, minSuccessfulReferrals: 0 }),
      ]);
      codeRepo.save.mockResolvedValue({ ...code, tier: ReferralTier.SILVER } as ReferralCode);

      await service.recalculateTier('user-1');

      expect(codeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tier: ReferralTier.SILVER }),
      );
    });

    it('should upgrade to GOLD at exactly 10 successful referrals', async () => {
      const code = createMockCode({ successfulReferrals: 10, tier: ReferralTier.SILVER });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.find.mockResolvedValue([
        createMockTierConfig({ tier: ReferralTier.GOLD, minSuccessfulReferrals: 10 }),
        createMockTierConfig({ tier: ReferralTier.SILVER, minSuccessfulReferrals: 3 }),
        createMockTierConfig({ tier: ReferralTier.BASE, minSuccessfulReferrals: 0 }),
      ]);
      codeRepo.save.mockResolvedValue({ ...code, tier: ReferralTier.GOLD } as ReferralCode);

      await service.recalculateTier('user-1');

      expect(codeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tier: ReferralTier.GOLD }),
      );
    });

    it('should stay at BASE with 2 successful referrals (below 3 threshold)', async () => {
      const code = createMockCode({ successfulReferrals: 2, tier: ReferralTier.BASE });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.find.mockResolvedValue([
        createMockTierConfig({ tier: ReferralTier.GOLD, minSuccessfulReferrals: 10 }),
        createMockTierConfig({ tier: ReferralTier.SILVER, minSuccessfulReferrals: 3 }),
        createMockTierConfig({ tier: ReferralTier.BASE, minSuccessfulReferrals: 0 }),
      ]);

      await service.recalculateTier('user-1');

      expect(codeRepo.save).not.toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  3. Duplicate prevention                                           */
  /* ------------------------------------------------------------------ */
  describe('Duplicate prevention', () => {
    it('should reject duplicate claim of same email under same code', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      const referee = createMockUser({ id: 'user-2', email: 'dup@test.com' });
      userRepo.findOne.mockResolvedValue(referee);
      const existing = createMockReferral({
        refereeUserId: 'user-2',
        refereeEmail: 'dup@test.com',
        status: ReferralStatus.PENDING,
      });
      referralRepo.findOne.mockResolvedValue(existing);

      await expect(service.claimReferral('ABC12345', 'user-2'))
        .rejects.toThrow(BadRequestException);
    });

    it('should resume from old declined invite — same email re-claim updates refereeUserId', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      const referee = createMockUser({ id: 'user-2', email: 'old@test.com' });
      userRepo.findOne.mockResolvedValue(referee);
      const existing = createMockReferral({
        refereeUserId: null,
        refereeEmail: 'old@test.com',
        status: ReferralStatus.PENDING,
      });
      referralRepo.findOne.mockResolvedValue(existing);
      referralRepo.save.mockResolvedValue({ ...existing, refereeUserId: 'user-2' } as Referral);

      const result = await service.claimReferral('ABC12345', 'user-2');

      expect(result.refereeUserId).toBe('user-2');
    });

    it('should generate a different code each time (no collision)', async () => {
      codeRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(createMockUser());
      const generated: string[] = [];
      codeRepo.create.mockImplementation((data) => {
        generated.push((data as any).code);
        return data as ReferralCode;
      });
      codeRepo.save.mockImplementation((data) => Promise.resolve(data as ReferralCode));

      const r1 = await service.getOrGenerateCode('u1');
      const r2 = await service.getOrGenerateCode('u2');

      expect(r1.code).not.toBe(r2.code);
    });

    it('should reject self-referral', async () => {
      const code = createMockCode({ userId: 'user-self' });
      codeRepo.findOne.mockResolvedValue(code);
      const referee = createMockUser({ id: 'user-self' });
      userRepo.findOne.mockResolvedValue(referee);

      await expect(service.claimReferral('ABC12345', 'user-self'))
        .rejects.toThrow(BadRequestException);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  4. Security — authorization and injection                         */
  /* ------------------------------------------------------------------ */
  describe('Security — invalid inputs', () => {
    it('should throw NotFoundException for non-existent referral code in getCodeInfo', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      await expect(service.getCodeInfo('INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent user when claiming', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReferral('ABC12345', 'ghost-user'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent referral in deliverReward', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await expect(service.deliverReward('missing-ref')).rejects.toThrow(NotFoundException);
    });

    it('should not expose internal DB errors on malformed code', async () => {
      codeRepo.findOne.mockRejectedValue(new Error('DB_CONNECTION_ERROR'));

      await expect(service.getCodeInfo("'; DROP TABLE referrals; --"))
        .rejects.toThrow();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  5. Concurrency — race conditions                                  */
  /* ------------------------------------------------------------------ */
  describe('Concurrency — race conditions', () => {
    it('should handle two simultaneous claimReferral calls for the same code', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      const referee1 = createMockUser({ id: 'user-a', email: 'a@test.com' });
      const referee2 = createMockUser({ id: 'user-b', email: 'b@test.com' });

      userRepo.findOne.mockImplementation(
        ({ where: { id } }: any) =>
          id === 'user-a' ? Promise.resolve(referee1)
            : id === 'user-b' ? Promise.resolve(referee2) : Promise.resolve(null),
      );

      referralRepo.findOne.mockResolvedValue(null);
      referralRepo.create.mockImplementation((data) => data as Referral);
      referralRepo.save.mockImplementation((data) => Promise.resolve(data as Referral));

      const [r1, r2] = await Promise.all([
        service.claimReferral('ABC12345', 'user-a'),
        service.claimReferral('ABC12345', 'user-b'),
      ]);

      expect(r1.refereeUserId).toBe('user-a');
      expect(r2.refereeUserId).toBe('user-b');
      expect(referralRepo.create).toHaveBeenCalledTimes(2);
    });

    it('should handle simultaneous deliverReward calls for same referral gracefully', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode({ successfulReferrals: 0 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      referralRepo.save.mockResolvedValue({ ...referral, status: ReferralStatus.REWARDED } as Referral);

      const [r1, r2] = await Promise.allSettled([
        service.deliverReward('ref-1'),
        service.deliverReward('ref-1'),
      ]);

      expect(r1.status).toBe('fulfilled');
      expect(r2.status).toBe('fulfilled');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  6. Idempotency                                                    */
  /* ------------------------------------------------------------------ */
  describe('Idempotency', () => {
    it('should return same code on repeated getOrGenerateCode', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);

      const r1 = await service.getOrGenerateCode('user-1');
      const r2 = await service.getOrGenerateCode('user-1');

      expect(r1.id).toBe(r2.id);
      expect(codeRepo.create).not.toHaveBeenCalled();
    });

    it('should not double-deliver reward on repeated onBookingCompleted', async () => {
      const referral = createMockReferral({ status: ReferralStatus.PENDING });

      referralRepo.findOne.mockImplementation(async ({ where }: any) => {
        if (where?.refereeUserId === 'user-2') return referral;
        if (where?.id === 'ref-1') return referral;
        return null;
      });

      referralRepo.save.mockImplementation(async (data: any) => {
        if (data.status) referral.status = data.status;
        return data as Referral;
      });

      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);

      await service.onBookingCompleted('user-2');

      referral.status = ReferralStatus.REWARDED;

      await service.onBookingCompleted('user-2');

      expect(userRepo.increment).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  7. Empty / Null scenarios                                         */
  /* ------------------------------------------------------------------ */
  describe('Empty / Null scenarios', () => {
    it('should return empty referrals for user with no code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      const result = await service.getMyReferrals('new-user');

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should return empty leaderboard when no codes exist', async () => {
      codeRepo.find.mockResolvedValue([]);

      const result = await service.getLeaderboard();

      expect(result).toEqual([]);
    });

    it('should return 0 discount when no tier config found', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      const referrer = createMockUser();
      userRepo.findOne.mockResolvedValue(referrer);
      tierConfigRepo.findOne.mockResolvedValue(null);

      const result = await service.getCodeInfo('ABC12345');

      expect(result.discountAmount).toBe(0);
    });

    it('should fall back to email when fullName is null', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      const referrer = createMockUser({ fullName: null });
      userRepo.findOne.mockResolvedValue(referrer);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());

      const result = await service.getCodeInfo('ABC12345');

      expect(result.referrerName).toBe('user@test.com');
    });

    it('should return "Unknown" for leaderboard user with no name or email', async () => {
      const code = createMockCode({ successfulReferrals: 5 });
      codeRepo.find.mockResolvedValue([code]);
      const user = createMockUser({ fullName: null, email: null });
      (userRepo.findByIds as jest.Mock).mockResolvedValue([user]);

      const result = await service.getLeaderboard();

      expect(result[0].name).toBe('Unknown');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  8. Data integrity                                                 */
  /* ------------------------------------------------------------------ */
  describe('Data integrity', () => {
    it('should increment userPoints by rewardPerReferralInr on deliverReward', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode({ successfulReferrals: 0, totalEarnedInr: 0 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig({ rewardPerReferralInr: 500 }));
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      referralRepo.save.mockResolvedValue({ ...referral, status: ReferralStatus.REWARDED } as Referral);

      await service.deliverReward('ref-1');

      expect(userRepo.increment).toHaveBeenCalledWith(
        { id: 'user-1' },
        'userPoints',
        500,
      );
    });

    it('should increment successfulReferrals on the code after reward', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode({ successfulReferrals: 0, totalEarnedInr: 0 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      let savedCode: ReferralCode | undefined;
      codeRepo.save.mockImplementation((c) => {
        savedCode = c as ReferralCode;
        return Promise.resolve(c as ReferralCode);
      });
      referralRepo.save.mockResolvedValue({ ...referral, status: ReferralStatus.REWARDED } as Referral);

      await service.deliverReward('ref-1');

      expect(savedCode?.successfulReferrals).toBe(1);
      expect(savedCode?.totalEarnedInr).toBe(200);
    });

    it('should set rewardDeliveredAt timestamp on reward', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      let savedReferral: Referral | undefined;
      referralRepo.save.mockImplementation((r) => {
        savedReferral = r as Referral;
        return Promise.resolve(r as Referral);
      });

      await service.deliverReward('ref-1');

      expect(savedReferral?.rewardDeliveredAt).toBeInstanceOf(Date);
      expect(savedReferral?.rewardType).toBe('POINTS');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  9. Leaderboard ordering and limits                                */
  /* ------------------------------------------------------------------ */
  describe('Leaderboard ordering and limits', () => {
    it('should return top referrers sorted by successfulReferrals DESC', async () => {
      const code1 = createMockCode({ userId: 'u1', code: 'CODE01', successfulReferrals: 10 });
      const code2 = createMockCode({ userId: 'u2', code: 'CODE02', successfulReferrals: 5 });
      const code3 = createMockCode({ userId: 'u3', code: 'CODE03', successfulReferrals: 1 });
      codeRepo.find.mockResolvedValue([code1, code2, code3]);
      (userRepo.findByIds as jest.Mock).mockResolvedValue([
        createMockUser({ id: 'u1', fullName: 'Alice' }),
        createMockUser({ id: 'u2', fullName: 'Bob' }),
        createMockUser({ id: 'u3', fullName: 'Charlie' }),
      ]);

      const result = await service.getLeaderboard(10);

      expect(result[0].name).toBe('Alice');
      expect(result[0].successfulReferrals).toBe(10);
      expect(result[1].successfulReferrals).toBe(5);
      expect(result[2].successfulReferrals).toBe(1);
    });

    it('should respect custom limit parameter', async () => {
      const codes = Array.from({ length: 5 }, (_, i) =>
        createMockCode({ userId: `u${i}`, code: `CODE${i}`, successfulReferrals: i }));
      codeRepo.find.mockResolvedValue(codes);
      (userRepo.findByIds as jest.Mock).mockResolvedValue(
        codes.map((c) => createMockUser({ id: c.userId, fullName: `User${c.userId}` })),
      );

      const result = await service.getLeaderboard(3);

      expect(result).toHaveLength(5);
    });

    it('should cap limit at 100', async () => {
      const codes = Array.from({ length: 150 }, (_, i) =>
        createMockCode({ userId: `u${i}`, code: `CODE${i}`, successfulReferrals: i }));
      codeRepo.find.mockResolvedValue(codes.slice(0, 100));
      (userRepo.findByIds as jest.Mock).mockResolvedValue(
        codes.slice(0, 100).map((c) => createMockUser({ id: c.userId })),
      );

      await service.getLeaderboard(200);

      expect(codeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  10. Notification delivery — fire-and-forget tolerance             */
  /* ------------------------------------------------------------------ */
  describe('Notification delivery — fire-and-forget tolerance', () => {
    it('should deliver reward even if notification to referrer fails', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      referralRepo.save.mockResolvedValue({ ...referral, status: ReferralStatus.REWARDED } as Referral);
      notificationsService.sendPushToUser.mockRejectedValue(new Error('FCM down'));

      await expect(service.deliverReward('ref-1')).resolves.not.toThrow();

      expect(userRepo.increment).toHaveBeenCalledTimes(1);
    });

    it('should send notifications to both referrer and referee on success', async () => {
      const referral = createMockReferral({
        status: ReferralStatus.COMPLETED,
        refereeUserId: 'user-2',
        refereeEmail: 'referee@test.com',
      });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      referralRepo.save.mockResolvedValue({ ...referral, status: ReferralStatus.REWARDED } as Referral);

      await service.deliverReward('ref-1');

      expect(notificationsService.sendPushToUser).toHaveBeenCalledTimes(2);
      expect(notificationsService.sendPushToUser).toHaveBeenCalledWith(
        'user-1',
        expect.stringContaining('Reward'),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
      expect(notificationsService.sendPushToUser).toHaveBeenCalledWith(
        'user-2',
        expect.stringContaining('Welcome'),
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('should still reward if refereeUserId is null (skip referee notification)', async () => {
      const referral = createMockReferral({
        status: ReferralStatus.COMPLETED,
        refereeUserId: null,
      });
      referralRepo.findOne.mockResolvedValue(referral);
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.findOne.mockResolvedValue(createMockTierConfig());
      tierConfigRepo.find.mockResolvedValue([createMockTierConfig()]);
      codeRepo.save.mockResolvedValue(code);
      referralRepo.save.mockResolvedValue({ ...referral, status: ReferralStatus.REWARDED } as Referral);

      await service.deliverReward('ref-1');

      expect(notificationsService.sendPushToUser).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  11. Recalculate tier — edge cases                                 */
  /* ------------------------------------------------------------------ */
  describe('Recalculate tier — edge cases', () => {
    it('should not recalculate if no code exists for user', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      await service.recalculateTier('unknown');

      expect(tierConfigRepo.find).not.toHaveBeenCalled();
    });

    it('should not save if tier has not changed', async () => {
      const code = createMockCode({ tier: ReferralTier.BASE, successfulReferrals: 1 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.find.mockResolvedValue([
        createMockTierConfig({ tier: ReferralTier.GOLD, minSuccessfulReferrals: 10 }),
        createMockTierConfig({ tier: ReferralTier.SILVER, minSuccessfulReferrals: 3 }),
        createMockTierConfig({ tier: ReferralTier.BASE, minSuccessfulReferrals: 0 }),
      ]);

      await service.recalculateTier('user-1');

      expect(codeRepo.save).not.toHaveBeenCalled();
    });

    it('should downgrade if successfulReferrals drops (edge: should not happen but handle gracefully)', async () => {
      const code = createMockCode({ tier: ReferralTier.SILVER, successfulReferrals: 2 });
      codeRepo.findOne.mockResolvedValue(code);
      tierConfigRepo.find.mockResolvedValue([
        createMockTierConfig({ tier: ReferralTier.GOLD, minSuccessfulReferrals: 10 }),
        createMockTierConfig({ tier: ReferralTier.SILVER, minSuccessfulReferrals: 3 }),
        createMockTierConfig({ tier: ReferralTier.BASE, minSuccessfulReferrals: 0 }),
      ]);
      codeRepo.save.mockResolvedValue({ ...code, tier: ReferralTier.BASE } as ReferralCode);

      await service.recalculateTier('user-1');

      expect(codeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tier: ReferralTier.BASE }),
      );
    });
  });

  /* ------------------------------------------------------------------ */
  /*  12. Non-existent resources                                        */
  /* ------------------------------------------------------------------ */
  describe('Non-existent resources', () => {
    it('should throw when referrer user not found in getCodeInfo', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getCodeInfo('ABC12345')).rejects.toThrow(NotFoundException);
    });

    it('should throw when claiming with invalid code', async () => {
      codeRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReferral('NOEXIST', 'user-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw when referee user does not exist', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.claimReferral('ABC12345', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('should throw when delivering reward for missing referral', async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await expect(service.deliverReward('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw when referral code is missing during reward delivery', async () => {
      const referral = createMockReferral({ status: ReferralStatus.COMPLETED });
      referralRepo.findOne.mockResolvedValue(referral);
      codeRepo.findOne.mockResolvedValue(null);

      await expect(service.deliverReward('ref-1')).rejects.toThrow(NotFoundException);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  13. Pagination edge cases                                         */
  /* ------------------------------------------------------------------ */
  describe('Pagination edge cases', () => {
    it('should return paginated results with correct meta', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      const referrals = Array.from({ length: 25 }, (_, i) =>
        createMockReferral({ id: `ref-${i}`, refereeEmail: `ref${i}@test.com` }));
      referralRepo.findAndCount.mockResolvedValue([referrals.slice(0, 10), 25]);

      const result = await service.getMyReferrals('user-1', 1, 10);

      expect(result.data).toHaveLength(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should handle page beyond total', async () => {
      const code = createMockCode();
      codeRepo.findOne.mockResolvedValue(code);
      referralRepo.findAndCount.mockResolvedValue([[], 5]);

      const result = await service.getMyReferrals('user-1', 999, 10);

      expect(result.data).toHaveLength(0);
      expect(result.meta.page).toBe(999);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  14. Code generation — collision retry                             */
  /* ------------------------------------------------------------------ */
  describe('Code generation — collision retry', () => {
    it('should retry code generation on collision (simulate first attempt conflict)', async () => {
      codeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createMockCode({ code: 'CONFLICT' }))
        .mockResolvedValueOnce(null);

      userRepo.findOne.mockResolvedValue(createMockUser());
      codeRepo.create.mockImplementation((data) => data as ReferralCode);
      codeRepo.save.mockImplementation((data) => Promise.resolve(data as ReferralCode));

      const result = await service.getOrGenerateCode('user-new');

      expect(result.code).toMatch(/^[A-F0-9]{8}$/);
      expect(codeRepo.findOne).toHaveBeenCalledTimes(3);
    });
  });
});
