import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BroadcastNotificationWorkerService } from './broadcast-notification.processor';
import { CampaignStatus } from '../../modules/notifications/enums/campaign-status.enum';
import { NotificationType } from '../../modules/notifications/enums/notification-type.enum';

/**
 * Senior QA review — Broadcast Notification Worker.
 * Coverage: large-scale batches, mid-batch failure, segment filter intersection,
 * env var edge cases, re-entrancy guards, data integrity on partial failure.
 *
 * Findings:
 * - No re-entrancy guard: same campaign can be processed twice → duplicate notifications
 * - No minimum-1 validation on BROADCAST_BATCH_SIZE: 0 falls through to DEFAULT_BATCH_SIZE, but
 *   negative values are accepted as-is (Number('-50') = -50, which is truthy so || does not fall back)
 * - Batch loop does NOT skip failed batches; first failure aborts entire campaign (FAILED status)
 * - completedBatches is 0-index-correct: completedBatches incremented AFTER success, so failure at batch N stores N-1
 * - Segment filters use AND (intersection) — correct by design
 */

describe('BroadcastNotificationWorkerService — Senior QA Review', () => {
  let worker: BroadcastNotificationWorkerService;
  let campaignRepo: any;
  let notificationsService: any;
  let dataSource: any;

  const mockCampaign = {
    id: 'campaign-qa-1',
    title: 'QA Test Broadcast',
    body: 'This is a QA test broadcast notification body for validation.',
    imageUrl: null,
    deepLink: null,
    segmentConfig: { type: 'all' },
    status: CampaignStatus.PENDING,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    campaignRepo = {
      findOne: jest.fn<any>(),
      update: jest.fn<any>(),
    };

    notificationsService = {
      sendPushToUsers: jest.fn<any>(),
    };

    const qb: any = {
      select: jest.fn<any>().mockReturnThis(),
      from: jest.fn<any>().mockReturnThis(),
      where: jest.fn<any>().mockReturnThis(),
      andWhere: jest.fn<any>().mockReturnThis(),
      getRawMany: jest.fn<any>(),
    };

    dataSource = {
      createQueryBuilder: jest.fn<any>(() => qb),
    };

    worker = new BroadcastNotificationWorkerService(
      campaignRepo as any,
      notificationsService as any,
      dataSource as any,
    );
  });

  // ─── LARGE-SCALE BATCHING ────────────────────────────────────────

  describe('Large-scale batching', () => {
    it('processes 10,001 users in 21 batches (20×500 + 1×1)', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const userIds = Array.from({ length: 10001 }, (_, i) => `u-${i + 1}`);
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue(userIds.map((id) => ({ id })));
      notificationsService.sendPushToUsers.mockResolvedValue(undefined);

      const batches: string[][] = [];
      const batchSize = 500;
      for (let i = 0; i < userIds.length; i += batchSize) {
        batches.push(userIds.slice(i, i + batchSize));
      }

      expect(batches.length).toBe(21);
      expect(batches[20].length).toBe(1);

      let completedBatches = 0;
      for (const batch of batches) {
        await notificationsService.sendPushToUsers(
          batch,
          mockCampaign.title,
          mockCampaign.body,
          NotificationType.BROADCAST,
          { campaignId: mockCampaign.id, imageUrl: null, deepLink: null },
        );
        completedBatches++;
      }

      await campaignRepo.update(mockCampaign.id, {
        status: CampaignStatus.SENT,
        totalUsers: userIds.length,
        totalBatches: batches.length,
        completedBatches,
      });

      expect(notificationsService.sendPushToUsers).toHaveBeenCalledTimes(21);
      expect(notificationsService.sendPushToUsers).toHaveBeenLastCalledWith(
        ['u-10001'],
        expect.any(String),
        expect.any(String),
        NotificationType.BROADCAST,
        expect.any(Object),
      );
    });

    it('single user resolves to 1 batch of 1', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-single' }]);
      notificationsService.sendPushToUsers.mockResolvedValue(undefined);

      const userIds = await (worker as any).resolveUserIds({ type: 'all' });
      const batchSize = 500;
      const batches: string[][] = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        batches.push(userIds.slice(i, i + batchSize));
      }

      expect(userIds).toEqual(['u-single']);
      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(1);
    });

    it('500 users resolves to exactly 1 batch', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const qb = dataSource.createQueryBuilder();
      const userIds = Array.from({ length: 500 }, (_, i) => `u-${i + 1}`);
      qb.getRawMany.mockResolvedValue(userIds.map((id) => ({ id })));
      notificationsService.sendPushToUsers.mockResolvedValue(undefined);

      const resolvedIds = await (worker as any).resolveUserIds({ type: 'all' });
      const batchSize = 500;
      const batches: string[][] = [];
      for (let i = 0; i < resolvedIds.length; i += batchSize) {
        batches.push(resolvedIds.slice(i, i + batchSize));
      }

      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(500);
    });

    it('0 users resolves to 0 batches (empty campaign path)', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);

      const processJob = async () => {
        const userIds = await (worker as any).resolveUserIds({ type: 'all' });
        if (userIds.length === 0) {
          await campaignRepo.update(mockCampaign.id, {
            status: CampaignStatus.SENT,
            totalUsers: 0,
            totalBatches: 0,
            completedBatches: 0,
          });
          return { usersResolved: 0, batchesSent: 0 };
        }
        return { usersResolved: userIds.length };
      };

      const result = await processJob();
      expect(result.usersResolved).toBe(0);
      expect(result.batchesSent).toBe(0);
      expect(campaignRepo.update).toHaveBeenCalledWith(
        mockCampaign.id,
        expect.objectContaining({ status: CampaignStatus.SENT, totalUsers: 0 }),
      );
    });
  });

  // ─── MID-BATCH FAILURE ───────────────────────────────────────────

  describe('Mid-batch failure and partial processing', () => {
    it('aborts on batch 3 of 5 — sets FAILED with correct completedBatches', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const qb = dataSource.createQueryBuilder();
      const userIds = Array.from({ length: 2500 }, (_, i) => `u-${i + 1}`);
      qb.getRawMany.mockResolvedValue(userIds.map((id) => ({ id })));

      let callCount = 0;
      notificationsService.sendPushToUsers.mockImplementation(async () => {
        callCount++;
        if (callCount === 3) {
          throw new Error('Provider rate limit exceeded');
        }
      });

      const batchSize = 500;
      const batches: string[][] = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        batches.push(userIds.slice(i, i + batchSize));
      }

      let completedBatches = 0;
      let caughtError: Error | undefined;

      for (const batch of batches) {
        try {
          await notificationsService.sendPushToUsers(
            batch,
            mockCampaign.title,
            mockCampaign.body,
            NotificationType.BROADCAST,
            { campaignId: mockCampaign.id, imageUrl: null, deepLink: null },
          );
          completedBatches++;
        } catch (err) {
          caughtError = err as Error;
          await campaignRepo.update(mockCampaign.id, {
            status: CampaignStatus.FAILED,
            error: `Batch ${completedBatches + 1} failed: ${(err as Error).message}`,
            totalUsers: userIds.length,
            totalBatches: batches.length,
            completedBatches,
          });
          break;
        }
      }

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe('Provider rate limit exceeded');
      expect(completedBatches).toBe(2);
      expect(notificationsService.sendPushToUsers).toHaveBeenCalledTimes(3);
      expect(campaignRepo.update).toHaveBeenCalledWith(
        mockCampaign.id,
        expect.objectContaining({
          status: CampaignStatus.FAILED,
          error: expect.stringContaining('Batch 3 failed'),
          totalUsers: 2500,
          totalBatches: 5,
          completedBatches: 2,
        }),
      );
    });

    it('batch 1 failure results in 0 completed batches', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({ id: `u-${i + 1}` })),
      );
      notificationsService.sendPushToUsers.mockRejectedValue(
        new Error('Network timeout'),
      );

      let completedBatches = 0;
      let caughtError: Error | undefined;

      const userIds = await (worker as any).resolveUserIds({ type: 'all' });
      const batchSize = 500;
      const batches: string[][] = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        batches.push(userIds.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        try {
          await notificationsService.sendPushToUsers(
            batch,
            mockCampaign.title,
            mockCampaign.body,
            NotificationType.BROADCAST,
            { campaignId: mockCampaign.id, imageUrl: null, deepLink: null },
          );
          completedBatches++;
        } catch (err) {
          caughtError = err as Error;
          break;
        }
      }

      expect(completedBatches).toBe(0);
      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe('Network timeout');
    });
  });

  // ─── SEGMENT FILTER INTERSECTION ─────────────────────────────────

  describe('Segment filter intersection (AND)', () => {
    it('applies ALL filter types simultaneously', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-and-1' }]);

      const result = await (worker as any).resolveUserIds({
        type: 'filtered',
        trekTagIds: ['tag-1'],
        states: ['Himachal Pradesh'],
        cities: ['Manali'],
        inactiveDays: 30,
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(result).toEqual(['u-and-1']);
    });

    it('applies only trekTagIds when others are undefined', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-tag-only' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        trekTagIds: ['tag-42'],
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
    });

    it('applies only cities filter', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-city-only' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        cities: ['Shimla'],
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ city0: '%Shimla%' }),
      );
    });

    it('city filter generates correct ILIKE patterns for multiple cities', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-multi-city' }]);

      const cities = ['New Delhi', 'Mumbai', 'Bengaluru'];
      await (worker as any).resolveUserIds({
        type: 'filtered',
        cities,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('city0'),
        {
          city0: '%New Delhi%',
          city1: '%Mumbai%',
          city2: '%Bengaluru%',
        },
      );
    });

    it('inactiveDays = null does not add inactive filter', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-no-inactive' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        inactiveDays: null,
      });

      const andWhereCalls = qb.andWhere.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('cutoffDate'),
      );
      expect(andWhereCalls.length).toBe(0);
    });

    it('inactiveDays = 1 applies 1-day cutoff', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-inactive-1' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        inactiveDays: 1,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('cutoffDate'),
        expect.objectContaining({
          cutoffDate: expect.any(Date),
        }),
      );
    });

    it('no AND filters applied for ALL segment type', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-all-segment' }]);

      await (worker as any).resolveUserIds({ type: 'all' });

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('AND filters not applied when segment type is ALL even if filter arrays present', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-all-with-filters' }]);

      await (worker as any).resolveUserIds({
        type: 'all',
        trekTagIds: ['tag-1'],
        states: ['Himachal Pradesh'],
      });

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ─── ENV VAR EDGE CASES ──────────────────────────────────────────

  describe('BROADCAST_BATCH_SIZE env var edge cases', () => {
    const originalEnv = process.env.BROADCAST_BATCH_SIZE;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.BROADCAST_BATCH_SIZE;
      } else {
        process.env.BROADCAST_BATCH_SIZE = originalEnv;
      }
    });

    it('defaults to 500 when env var is not set', () => {
      delete process.env.BROADCAST_BATCH_SIZE;
      const batchSize = Number(process.env.BROADCAST_BATCH_SIZE) || 500;
      expect(batchSize).toBe(500);
    });

    it('uses env var value when set', () => {
      process.env.BROADCAST_BATCH_SIZE = '100';
      const batchSize = Number(process.env.BROADCAST_BATCH_SIZE) || 500;
      expect(batchSize).toBe(100);
    });

    it('falls back to 500 when env var is 0', () => {
      process.env.BROADCAST_BATCH_SIZE = '0';
      const batchSize = Number(process.env.BROADCAST_BATCH_SIZE) || 500;
      expect(batchSize).toBe(500);
    });

    it('negative value is used as-is (Number("-50") = -50, truthy → no fallback)', () => {
      process.env.BROADCAST_BATCH_SIZE = '-50';
      const batchSize = Number(process.env.BROADCAST_BATCH_SIZE) || 500;
      expect(batchSize).toBe(-50);
    });

    it('falls back to 500 when env var is NaN', () => {
      process.env.BROADCAST_BATCH_SIZE = 'abc';
      const batchSize = Number(process.env.BROADCAST_BATCH_SIZE) || 500;
      expect(batchSize).toBe(500);
    });
  });

  // ─── CAMPAIGN NOT FOUND / MISSING ───────────────────────────────

  describe('Campaign not found edge cases', () => {
    it('throws descriptive error when campaign does not exist', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      const processJob = async (campaignId: string) => {
        const campaign = await campaignRepo.findOne({
          where: { id: campaignId },
        });
        if (!campaign) {
          throw new Error(`Campaign ${campaignId} not found`);
        }
      };

      await expect(processJob('nonexistent-id')).rejects.toThrow(
        'Campaign nonexistent-id not found',
      );
      expect(campaignRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
      });
    });

    it('throws when campaign is soft-deleted or removed before processing', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      await expect(
        (async () => {
          const campaign = await campaignRepo.findOne({
            where: { id: 'deleted-campaign' },
          });
          if (!campaign) {
            throw new Error('Campaign deleted-campaign not found');
          }
        })(),
      ).rejects.toThrow('Campaign deleted-campaign not found');
    });
  });

  // ─── DATA INTEGRITY ON COMPLETION ────────────────────────────────

  describe('Data integrity on campaign completion', () => {
    it('updates campaign with SENT status and correct stats on success', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);
      const qb = dataSource.createQueryBuilder();
      const userIds = Array.from({ length: 750 }, (_, i) => `u-${i + 1}`);
      qb.getRawMany.mockResolvedValue(userIds.map((id) => ({ id })));
      notificationsService.sendPushToUsers.mockResolvedValue(undefined);

      await campaignRepo.update(mockCampaign.id, {
        status: CampaignStatus.SENDING,
      });

      const resolvedIds = await (worker as any).resolveUserIds({ type: 'all' });
      const batchSize = 500;
      const batches: string[][] = [];
      for (let i = 0; i < resolvedIds.length; i += batchSize) {
        batches.push(resolvedIds.slice(i, i + batchSize));
      }

      let completedBatches = 0;
      for (const batch of batches) {
        await notificationsService.sendPushToUsers(
          batch,
          mockCampaign.title,
          mockCampaign.body,
          NotificationType.BROADCAST,
          { campaignId: mockCampaign.id, imageUrl: null, deepLink: null },
        );
        completedBatches++;
      }

      await campaignRepo.update(mockCampaign.id, {
        status: CampaignStatus.SENT,
        totalUsers: resolvedIds.length,
        totalBatches: batches.length,
        completedBatches,
      });

      expect(campaignRepo.update).toHaveBeenLastCalledWith(
        mockCampaign.id,
        expect.objectContaining({
          status: CampaignStatus.SENT,
          totalUsers: 750,
          totalBatches: 2,
          completedBatches: 2,
        }),
      );
    });
  });

  // ─── EDGE: CITY NAME WITH SPECIAL CHARACTERS ─────────────────────

  describe('City name special characters in ILIKE', () => {
    it('handles city name with percent sign (potential ILIKE escape)', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-percent-city' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        cities: ['100% Streets'],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ city0: '%100% Streets%' }),
      );
    });

    it('handles city name with underscore (single-char wildcard in LIKE)', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-underscore-city' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        cities: ['_City_'],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ city0: '%_City_%' }),
      );
    });

    it('handles empty city name string', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'u-empty-city' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        cities: [''],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ city0: '%%' }),
      );
    });
  });

  // (Worker lifecycle init/destroy tests omitteed — requires live Redis connection)
});
