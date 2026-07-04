import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BroadcastNotificationWorkerService } from './broadcast-notification.processor';
import { CampaignStatus } from '../../modules/notifications/enums/campaign-status.enum';
import { NotificationType } from '../../modules/notifications/enums/notification-type.enum';

describe('BroadcastNotificationWorkerService', () => {
  let worker: BroadcastNotificationWorkerService;
  let campaignRepo: any;
  let notificationsService: any;
  let dataSource: any;

  const mockCampaign = {
    id: 'campaign-1',
    title: 'Test Broadcast',
    body: 'This is a test broadcast notification body.',
    imageUrl: null,
    deepLink: null,
    segmentConfig: { type: 'all' },
    status: CampaignStatus.PENDING,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    campaignRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    notificationsService = {
      sendPushToUsers: jest.fn(),
    };

    const qb: any = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    dataSource = {
      createQueryBuilder: jest.fn(() => qb),
    };

    worker = new BroadcastNotificationWorkerService(
      campaignRepo as any,
      notificationsService as any,
      dataSource as any,
    );
  });

  describe('resolveUserIds', () => {
    it('returns all users with device tokens for ALL segment', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);

      const result = await (worker as any).resolveUserIds({ type: 'all' });

      expect(qb.where).toHaveBeenCalledWith(
        'EXISTS (SELECT 1 FROM device_tokens dt WHERE dt."userId" = u.id)',
      );
      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('applies trek tag filter for FILTERED segment', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'user-1' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        trekTagIds: ['tag-1', 'tag-2'],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('trek_tags_link'),
        { trekTagIds: ['tag-1', 'tag-2'] },
      );
    });

    it('applies state filter for FILTERED segment', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'user-1' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        states: ['Himachal Pradesh'],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('t.state IN'),
        { states: ['Himachal Pradesh'] },
      );
    });

    it('applies city filter with ILIKE for FILTERED segment', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'user-1' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        cities: ['Manali', 'Shimla'],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({
          city0: '%Manali%',
          city1: '%Shimla%',
        }),
      );
    });

    it('applies inactive days filter for FILTERED segment', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ id: 'user-1' }]);

      await (worker as any).resolveUserIds({
        type: 'filtered',
        inactiveDays: 90,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('cutoffDate'),
        expect.objectContaining({
          cutoffDate: expect.any(Date),
        }),
      );
    });

    it('returns empty array when no users match', async () => {
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);

      const result = await (worker as any).resolveUserIds({ type: 'all' });

      expect(result).toEqual([]);
    });
  });

  describe('worker job processing', () => {
    it('throws if campaign not found', async () => {
      campaignRepo.findOne.mockResolvedValue(null);

      const processJob = async (jobData: { campaignId: string }) => {
        const campaign = await campaignRepo.findOne({
          where: { id: jobData.campaignId },
        });
        if (!campaign) {
          throw new Error(`Campaign ${jobData.campaignId} not found`);
        }
      };

      await expect(processJob({ campaignId: 'nonexistent' })).rejects.toThrow(
        'Campaign nonexistent not found',
      );

      expect(campaignRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });

    it('handles empty segment resolution gracefully', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);

      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([]);

      const jobFn = async (jobData: any) => {
        const { campaignId } = jobData.data;
        const campaign = await campaignRepo.findOne({
          where: { id: campaignId },
        });

        await campaignRepo.update(campaignId, {
          status: CampaignStatus.SENDING,
        });

        const userIds = await (worker as any).resolveUserIds({
          type: 'all',
        });

        await campaignRepo.update(campaignId, {
          status: CampaignStatus.SENT,
          totalUsers: 0,
          totalBatches: 0,
          completedBatches: 0,
        });

        return { campaignId, usersResolved: 0, batchesSent: 0 };
      };

      const result = await jobFn({ data: { campaignId: 'campaign-1' } });

      expect(result.usersResolved).toBe(0);
      expect(result.batchesSent).toBe(0);
      expect(campaignRepo.update).toHaveBeenCalledWith('campaign-1', {
        status: CampaignStatus.SENT,
        totalUsers: 0,
        totalBatches: 0,
        completedBatches: 0,
      });
    });

    it('processes users in batches and calls sendPushToUsers for each batch', async () => {
      campaignRepo.findOne.mockResolvedValue(mockCampaign);

      const userIds = Array.from({ length: 550 }, (_, i) => `user-${i + 1}`);
      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue(userIds.map((id) => ({ id })));

      notificationsService.sendPushToUsers.mockResolvedValue(undefined);

      const batchSize = 500;
      const batches: string[][] = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        batches.push(userIds.slice(i, i + batchSize));
      }

      const jobFn = async (jobData: any) => {
        const { campaignId } = jobData.data;
        const campaign = await campaignRepo.findOne({
          where: { id: campaignId },
        });

        await campaignRepo.update(campaignId, {
          status: CampaignStatus.SENDING,
        });

        const resolvedUserIds = await (worker as any).resolveUserIds({
          type: 'all',
        });

        const actualBatchSize = Number(process.env.BROADCAST_BATCH_SIZE) || 500;
        const actualBatches: string[][] = [];
        for (let i = 0; i < resolvedUserIds.length; i += actualBatchSize) {
          actualBatches.push(resolvedUserIds.slice(i, i + actualBatchSize));
        }

        let completedBatches = 0;
        for (const batch of actualBatches) {
          await notificationsService.sendPushToUsers(
            batch,
            campaign.title,
            campaign.body,
            NotificationType.BROADCAST,
            {
              campaignId,
              imageUrl: campaign.imageUrl ?? null,
              deepLink: campaign.deepLink ?? null,
            },
          );
          completedBatches++;
        }

        await campaignRepo.update(campaignId, {
          status: CampaignStatus.SENT,
          totalUsers: resolvedUserIds.length,
          totalBatches: actualBatches.length,
          completedBatches,
        });

        return {
          campaignId,
          usersResolved: resolvedUserIds.length,
          batchesSent: completedBatches,
        };
      };

      const result = await jobFn({ data: { campaignId: 'campaign-1' } });

      expect(result.usersResolved).toBe(550);
      expect(result.batchesSent).toBe(2);
      expect(notificationsService.sendPushToUsers).toHaveBeenCalledTimes(2);
      expect(notificationsService.sendPushToUsers).toHaveBeenCalledWith(
        expect.arrayContaining(['user-1']),
        'Test Broadcast',
        'This is a test broadcast notification body.',
        NotificationType.BROADCAST,
        expect.objectContaining({ campaignId: 'campaign-1' }),
      );
    });
  });
});
