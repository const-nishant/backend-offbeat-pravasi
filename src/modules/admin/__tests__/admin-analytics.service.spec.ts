import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminAnalyticsService } from '../admin-analytics.service';

describe('AdminAnalyticsService', () => {
  let service: AdminAnalyticsService;
  let dataSource: any;
  let redisService: any;

  beforeEach(() => {
    jest.resetAllMocks();

    dataSource = { query: jest.fn<any>() };
    redisService = {
      get: jest.fn<any>(),
      set: jest.fn<any>(),
    };

    service = new AdminAnalyticsService(dataSource as any, redisService as any);
  });

  describe('getDau', () => {
    it('returns cached data when available', async () => {
      const cached = JSON.stringify([{ date: '2026-07-01', count: 42 }]);
      redisService.get.mockResolvedValue(cached);

      const result = await service.getDau(7);

      expect(dataSource.query).not.toHaveBeenCalled();
      expect(result).toEqual([{ date: '2026-07-01', count: 42 }]);
    });

    it('queries and caches when cache is empty', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        { date: new Date('2026-07-01'), count: '42' },
        { date: new Date('2026-07-02'), count: '55' },
      ]);

      const result = await service.getDau(7);

      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [7]);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: expect.any(Date), count: 42 });
      expect(result[1]).toEqual({ date: expect.any(Date), count: 55 });
      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 300);
    });
  });

  describe('getTrekPopularity', () => {
    it('queries trek_interactions grouped by trek', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        { id: 'trek-1', name: 'Trek A', state: 'HP', difficulty: 'MODERATE', total_users: '10', views: '100', bookmarks: '20', likes: '15', bookings: '5' },
      ]);

      const result = await service.getTrekPopularity(30, 10);

      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [30, 10]);
      expect(result).toHaveLength(1);
      expect(result[0].trekId).toBe('trek-1');
      expect(result[0].views).toBe(100);
      expect(result[0].bookmarks).toBe(20);
      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 600);
    });
  });

  describe('getConversionFunnel', () => {
    it('returns counts for each funnel stage', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([{ count: '1000' }])
        .mockResolvedValueOnce([{ count: '200' }])
        .mockResolvedValueOnce([{ count: '150' }])
        .mockResolvedValueOnce([{ count: '130' }])
        .mockResolvedValueOnce([{ count: '120' }]);

      const result = await service.getConversionFunnel();

      expect(result.stages.views).toBe(1000);
      expect(result.stages.bookingsStarted).toBe(200);
      expect(result.stages.paymentsInitiated).toBe(150);
      expect(result.stages.paymentsCompleted).toBe(130);
      expect(result.stages.bookingsConfirmed).toBe(120);
      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 900);
    });

    it('applies date filters when provided', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([{ count: '500' }])
        .mockResolvedValueOnce([{ count: '100' }])
        .mockResolvedValueOnce([{ count: '80' }])
        .mockResolvedValueOnce([{ count: '70' }])
        .mockResolvedValueOnce([{ count: '60' }]);

      const result = await service.getConversionFunnel('2026-01-01', '2026-06-30');

      expect(dataSource.query).toHaveBeenCalledTimes(5);
      expect(result.stages.views).toBe(500);
    });
  });

  describe('getRevenueTrends', () => {
    it('queries payments grouped by date and provider', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        { date: new Date('2026-07-01'), provider: 'STRIPE', transaction_count: '10', revenue: '50000', active_users: '8' },
        { date: new Date('2026-07-01'), provider: 'RAZORPAY', transaction_count: '5', revenue: '25000', active_users: '4' },
      ]);

      const result = await service.getRevenueTrends('daily', 30);

      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), ['day', 30]);
      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe('STRIPE');
      expect(result[0].revenue).toBe(50000);
      expect(redisService.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 600);
    });

    it('maps weekly and monthly periods', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      await service.getRevenueTrends('monthly', 90);
      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), ['month', 90]);

      await service.getRevenueTrends('weekly', 90);
      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), ['week', 90]);
    });
  });

  describe('getRetentionCohorts', () => {
    it('computes retention rates for each cohort', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        {
          cohort_month: new Date('2026-06-01'),
          total_users: '100',
          retained_d7: '60',
          retained_d30: '40',
          retained_d90: '20',
        },
        {
          cohort_month: new Date('2026-05-01'),
          total_users: '100',
          retained_d7: '55',
          retained_d30: '35',
          retained_d90: '15',
        },
      ]);

      const result = await service.getRetentionCohorts(6);

      expect(result).toHaveLength(2);
      expect(result[0].cohortMonth).toEqual(new Date('2026-06-01'));
      expect(result[0].totalUsers).toBe(100);
      expect(result[0].retainedD7).toBe(60);
      expect(result[0].retentionRateD7).toBe(60);
      expect(result[0].retainedD30).toBe(40);
      expect(result[0].retentionRateD30).toBe(40);
      expect(result[0].retainedD90).toBe(20);
      expect(result[0].retentionRateD90).toBe(20);
    });

    it('handles empty data', async () => {
      redisService.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      const result = await service.getRetentionCohorts(12);

      expect(result).toHaveLength(0);
    });
  });
});
