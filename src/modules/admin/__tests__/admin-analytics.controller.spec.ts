import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminAnalyticsController } from '../admin-analytics.controller';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let service: any;

  beforeEach(() => {
    service = {
      getDau: jest
        .fn<any>()
        .mockResolvedValue([{ date: '2026-07-01', count: 42 }]),
      getTrekPopularity: jest
        .fn<any>()
        .mockResolvedValue([
          { trekId: 'trek-1', name: 'Trek A', views: 100, bookmarks: 20 },
        ]),
      getConversionFunnel: jest.fn<any>().mockResolvedValue({
        stages: {
          views: 1000,
          bookingsStarted: 200,
          paymentsInitiated: 150,
          paymentsCompleted: 130,
          bookingsConfirmed: 120,
        },
      }),
      getRevenueTrends: jest
        .fn<any>()
        .mockResolvedValue([
          { date: '2026-07-01', provider: 'STRIPE', revenue: 50000 },
        ]),
      getRetentionCohorts: jest
        .fn<any>()
        .mockResolvedValue([
          { cohortMonth: '2026-06-01', totalUsers: 100, retentionRateD7: 60 },
        ]),
    };

    controller = new AdminAnalyticsController(service);
  });

  describe('getDau', () => {
    it('delegates to service with default 7 days', async () => {
      const result = await controller.getDau({});

      expect(service.getDau).toHaveBeenCalledWith(7);
      expect(result).toEqual([{ date: '2026-07-01', count: 42 }]);
    });

    it('passes custom days param', async () => {
      const result = await controller.getDau({ days: 30 });

      expect(service.getDau).toHaveBeenCalledWith(30);
    });
  });

  describe('getTrekPopularity', () => {
    it('delegates to service with defaults', async () => {
      const result = await controller.getTrekPopularity({});

      expect(service.getTrekPopularity).toHaveBeenCalledWith(30, 50);
      expect(result).toHaveLength(1);
    });

    it('passes custom params', async () => {
      await controller.getTrekPopularity({ days: 7, limit: 10 });

      expect(service.getTrekPopularity).toHaveBeenCalledWith(7, 10);
    });
  });

  describe('getConversionFunnel', () => {
    it('delegates to service with query params', async () => {
      const result = await controller.getConversionFunnel({
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });

      expect(service.getConversionFunnel).toHaveBeenCalledWith(
        '2026-01-01',
        '2026-06-30',
        undefined,
      );
      expect(result.stages.views).toBe(1000);
    });

    it('passes trekId filter', async () => {
      await controller.getConversionFunnel({ trekId: 'trek-1' });

      expect(service.getConversionFunnel).toHaveBeenCalledWith(
        undefined,
        undefined,
        'trek-1',
      );
    });
  });

  describe('getRevenueTrends', () => {
    it('delegates to service with defaults', async () => {
      const result = await controller.getRevenueTrends({});

      expect(service.getRevenueTrends).toHaveBeenCalledWith('daily', 90);
      expect(result).toHaveLength(1);
    });

    it('passes custom params', async () => {
      await controller.getRevenueTrends({ period: 'monthly', days: 180 });

      expect(service.getRevenueTrends).toHaveBeenCalledWith('monthly', 180);
    });
  });

  describe('getRetentionCohorts', () => {
    it('delegates to service with default 12 months', async () => {
      const result = await controller.getRetentionCohorts({});

      expect(service.getRetentionCohorts).toHaveBeenCalledWith(12);
      expect(result).toHaveLength(1);
    });

    it('passes custom months', async () => {
      await controller.getRetentionCohorts({ months: 6 });

      expect(service.getRetentionCohorts).toHaveBeenCalledWith(6);
    });
  });
});
