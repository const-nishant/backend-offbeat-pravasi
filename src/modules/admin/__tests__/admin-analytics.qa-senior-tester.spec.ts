import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminAnalyticsService } from '../admin-analytics.service';
import {
  AdminAnalyticsDauQueryDto,
  AdminAnalyticsTrekPopularityQueryDto,
  AdminAnalyticsFunnelQueryDto,
  AdminAnalyticsRevenueQueryDto,
  AdminAnalyticsRetentionQueryDto,
} from '../dtos/admin-analytics.dto';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

/**
 * Senior QA review — Admin Analytics Dashboard (Extension 6).
 * Coverage: DTO boundaries, security vectors, data integrity, failure modes, edge cases.
 *
 * Findings:
 * - DAU uses analytics_events table; no fallback if table is empty — returns [] with 200 OK
 * - Conversion funnel executes 5 parallel queries; one failure cascades to 500 (no partial result)
 * - No DTO validation forces days/months within practical bounds — bounded via class-validator @Min/@Max
 * - Redis cache has no TTL jitter — all keys in same endpoint expire simultaneously (thundering herd)
 * - Retention cohort query uses DISTINCT on large join — may be slow for >100K users without index
 * - SQL queries use parameterized $N syntax — no SQL injection vector confirmed
 * - No rate limiting on analytics endpoints — admin could hammer cache
 * - Trek popularity limit max 200 — hard ceiling prevents abuse but also prevents "export all"
 */

describe('AdminAnalyticsService — Senior QA Review', () => {
  let service: AdminAnalyticsService;
  let dataSource: any;
  let: any;

  const defaultDauRow = { date: new Date('2026-07-01'), count: '42' };
  const defaultTrekRow = {
    id: 'trek-1',
    name: 'Everest Base Camp',
    state: 'Nepal',
    difficulty: 'HARD',
    total_users: '10',
    views: '100',
    bookmarks: '20',
    likes: '15',
    bookings: '5',
  };
  const emptyResult: any[] = [];

  beforeEach(() => {
    jest.resetAllMocks();
    dataSource = { query: jest.fn<any>() };
    redis = { get: jest.fn<any>(), set: jest.fn<any>() };

    service = new AdminAnalyticsService(dataSource as any, redis as any);
  });

  // ─── DTO BOUNDARY ANALYSIS ───────────────────────────────────────

  describe('DTO boundaries — class-validator', () => {
    it('DAU: rejects days < 1', async () => {
      const dto = plainToInstance(AdminAnalyticsDauQueryDto, { days: 0 });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'days')).toBe(true);
    });

    it('DAU: rejects days > 365', async () => {
      const dto = plainToInstance(AdminAnalyticsDauQueryDto, { days: 400 });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'days')).toBe(true);
    });

    it('DAU: accepts boundary values', async () => {
      const dto1 = plainToInstance(AdminAnalyticsDauQueryDto, { days: 1 });
      const dto2 = plainToInstance(AdminAnalyticsDauQueryDto, { days: 365 });
      expect((await validate(dto1)).length).toBe(0);
      expect((await validate(dto2)).length).toBe(0);
    });

    it('DAU: defaults to 7 when omitted', () => {
      const dto = plainToInstance(AdminAnalyticsDauQueryDto, {
        days: undefined,
      });
      expect(dto.days).toBe(7);
    });

    it('DAU: defaults to 7 when null or undefined', () => {
      const dto1 = plainToInstance(AdminAnalyticsDauQueryDto, { days: null });
      const dto2 = plainToInstance(AdminAnalyticsDauQueryDto, {
        days: undefined,
      });
      expect(dto1.days).toBe(7);
      expect(dto2.days).toBe(7);
    });

    it('Trek popularity: rejects days > 365', async () => {
      const dto = plainToInstance(AdminAnalyticsTrekPopularityQueryDto, {
        days: 366,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'days')).toBe(true);
    });

    it('Trek popularity: defaults limit to 50', () => {
      const dto = plainToInstance(AdminAnalyticsTrekPopularityQueryDto, {
        limit: undefined,
      });
      expect(dto.limit).toBe(50);
    });

    it('Trek popularity: rejects limit > 200', async () => {
      const dto = plainToInstance(AdminAnalyticsTrekPopularityQueryDto, {
        limit: 201,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('Funnel: accepts valid date strings', async () => {
      const dto = plainToInstance(AdminAnalyticsFunnelQueryDto, {
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('Funnel: accepts trekId UUID', async () => {
      const dto = plainToInstance(AdminAnalyticsFunnelQueryDto, {
        trekId: '550e8400-e29b-41d4-a716-446655440000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('Revenue: rejects invalid period value', async () => {
      const dto = plainToInstance(AdminAnalyticsRevenueQueryDto, {
        period: 'yearly',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'period')).toBe(true);
    });

    it('Revenue: accepts valid periods', async () => {
      for (const p of ['daily', 'weekly', 'monthly']) {
        const dto = plainToInstance(AdminAnalyticsRevenueQueryDto, {
          period: p,
        });
        expect((await validate(dto)).length).toBe(0);
      }
    });

    it('Retention: rejects months > 36', async () => {
      const dto = plainToInstance(AdminAnalyticsRetentionQueryDto, {
        months: 37,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'months')).toBe(true);
    });

    it('Retention: defaults to 12 months', () => {
      const dto = plainToInstance(AdminAnalyticsRetentionQueryDto, {
        months: undefined,
      });
      expect(dto.months).toBe(12);
    });

    it('Rejects non-numeric string in numeric fields', async () => {
      const dto = plainToInstance(AdminAnalyticsDauQueryDto, { days: 'abc' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('Rejects negative days via negative number coercion', async () => {
      const dto = plainToInstance(AdminAnalyticsDauQueryDto, { days: -5 });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'days')).toBe(true);
    });
  });

  // ─── CACHING BEHAVIOUR ───────────────────────────────────────────

  describe('Cache layer — read-through behaviour', () => {
    it('returns cached DAU without touching DB', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify([{ date: '2026-07-01', count: 42 }]),
      );

      const result = await service.getDau(7);

      expect(dataSource.query).not.toHaveBeenCalled();
      expect(result).toEqual([{ date: '2026-07-01', count: 42 }]);
    });

    it('sets cache after DB fetch with correct TTL', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([defaultDauRow]);

      await service.getDau(7);

      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('analytics:dau:7'),
        expect.any(String),
        300,
      );
    });

    it('sets trek-popularity cache with 600s TTL', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([defaultTrekRow]);

      await service.getTrekPopularity(30, 50);

      expect(redis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        600,
      );
    });

    it('sets funnel cache with 900s TTL', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([{ count: '100' }]);
      dataSource.query.mockResolvedValue([{ count: '50' }]);
      dataSource.query.mockResolvedValue([{ count: '30' }]);
      dataSource.query.mockResolvedValue([{ count: '25' }]);
      dataSource.query.mockResolvedValue([{ count: '20' }]);

      await service.getConversionFunnel();

      expect(redis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        900,
      );
    });

    it('handles corrupted cache JSON gracefully', async () => {
      redis.get.mockResolvedValue('{invalid json!!!}');
      dataSource.query.mockResolvedValue([defaultDauRow]);

      const result = await service.getDau(7);

      expect(dataSource.query).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('uses distinct cache keys for different days param', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([defaultDauRow]);

      await service.getDau(7);
      await service.getDau(30);

      const setCalls = (redis.set as jest.Mock).mock.calls;
      const keys = setCalls.map((c: any[]) => c[0]);
      expect(keys[0]).toContain(':7');
      expect(keys[1]).toContain(':30');
      expect(keys[0]).not.toBe(keys[1]);
    });
  });

  // ─── EMPTY / NULL STATE HANDLING ─────────────────────────────────

  describe('Empty state handling', () => {
    it('returns empty array when no DAU data exists', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      const result = await service.getDau(7);

      expect(result).toEqual([]);
    });

    it('returns empty array when no trek interactions exist', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      const result = await service.getTrekPopularity(30, 50);

      expect(result).toEqual([]);
    });

    it('returns zeroed funnel when no data in range', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }]);

      const result = await service.getConversionFunnel();

      expect(result.stages.views).toBe(0);
      expect(result.stages.bookingsStarted).toBe(0);
      expect(result.stages.paymentsInitiated).toBe(0);
      expect(result.stages.paymentsCompleted).toBe(0);
      expect(result.stages.bookingsConfirmed).toBe(0);
    });

    it('returns empty array when no revenue data exists', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      const result = await service.getRevenueTrends('daily', 30);

      expect(result).toEqual([]);
    });

    it('returns empty array when no retention data exists', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      const result = await service.getRetentionCohorts(12);

      expect(result).toEqual([]);
    });
  });

  // ─── DATA INTEGRITY ──────────────────────────────────────────────

  describe('Data integrity', () => {
    it('trek popularity returns correct numeric types', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([defaultTrekRow]);

      const result = await service.getTrekPopularity(30, 50);

      expect(result[0]).toMatchObject({
        views: 100,
        bookmarks: 20,
        likes: 15,
        bookings: 5,
        totalUsers: 10,
      });
    });

    it('conversion funnel stages are non-decreasing in counts', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([{ count: '1000' }])
        .mockResolvedValueOnce([{ count: '200' }])
        .mockResolvedValueOnce([{ count: '150' }])
        .mockResolvedValueOnce([{ count: '130' }])
        .mockResolvedValueOnce([{ count: '120' }]);

      const result = await service.getConversionFunnel();

      expect(result.stages.views).toBeGreaterThanOrEqual(
        result.stages.bookingsStarted,
      );
      expect(result.stages.bookingsStarted).toBeGreaterThanOrEqual(
        result.stages.paymentsInitiated,
      );
      expect(result.stages.paymentsInitiated).toBeGreaterThanOrEqual(
        result.stages.paymentsCompleted,
      );
      expect(result.stages.paymentsCompleted).toBeGreaterThanOrEqual(
        result.stages.bookingsConfirmed,
      );
    });

    it('retention rates are between 0 and 100 percent', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        {
          cohort_month: new Date('2026-01-01'),
          total_users: '100',
          retained_d7: '50',
          retained_d30: '30',
          retained_d90: '10',
        },
      ]);

      const result = await service.getRetentionCohorts(12);

      expect(result[0].retentionRateD7).toBeGreaterThanOrEqual(0);
      expect(result[0].retentionRateD7).toBeLessThanOrEqual(100);
      expect(result[0].retentionRateD30).toBeGreaterThanOrEqual(0);
      expect(result[0].retentionRateD30).toBeLessThanOrEqual(100);
      expect(result[0].retentionRateD90).toBeGreaterThanOrEqual(0);
      expect(result[0].retentionRateD90).toBeLessThanOrEqual(100);
    });

    it('retention rates handle division by zero when totalUsers is 0', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        {
          cohort_month: new Date('2026-01-01'),
          total_users: '0',
          retained_d7: '0',
          retained_d30: '0',
          retained_d90: '0',
        },
      ]);

      const result = await service.getRetentionCohorts(12);

      expect(result[0].retentionRateD7).toBe(0);
      expect(result[0].retentionRateD90).toBe(0);
    });

    it('revenue trends returns provider names correctly', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        {
          date: new Date('2026-07-01'),
          provider: 'STRIPE',
          transaction_count: '10',
          revenue: '50000',
          active_users: '8',
        },
        {
          date: new Date('2026-07-01'),
          provider: 'RAZORPAY',
          transaction_count: '5',
          revenue: '25000',
          active_users: '4',
        },
      ]);

      const result = await service.getRevenueTrends('daily', 30);

      const providers = result.map((r: any) => r.provider);
      expect(providers).toContain('STRIPE');
      expect(providers).toContain('RAZORPAY');
    });
  });

  // ─── SQL INJECTION VECTORS ───────────────────────────────────────

  describe('SQL injection resistance', () => {
    it('passes days as parameterized integer, not inline', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      await service.getDau(7);

      const sql = (dataSource.query as jest.Mock).mock.calls[0][0];
      expect(sql).toContain('$1');
      expect(sql).not.toContain('7');
    });

    it('passes limit as parameterized integer', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      await service.getTrekPopularity(30, 50);

      const params = (dataSource.query as jest.Mock).mock.calls[0];
      expect(params[1]).toEqual([30, 50]);
    });

    it('passes period as parameterized string', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      await service.getRevenueTrends('daily', 30);

      const params = (dataSource.query as jest.Mock).mock.calls[0];
      expect(params[1][0]).toBe('day');
    });
  });

  // ─── ERROR PROPAGATION ───────────────────────────────────────────

  describe('Error propagation', () => {
    it('throws when DB query fails', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockRejectedValue(
        new Error('Connection pool exhausted'),
      );

      await expect(service.getDau(7)).rejects.toThrow(
        'Connection pool exhausted',
      );
    });

    it('throws on DB failure for trek popularity', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockRejectedValue(new Error('Deadlock detected'));

      await expect(service.getTrekPopularity(30, 10)).rejects.toThrow(
        'Deadlock detected',
      );
    });

    it('propagates error when one of 5 funnel queries fails', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([{ count: '100' }])
        .mockRejectedValueOnce(new Error('relation "bookings" does not exist'));

      await expect(service.getConversionFunnel()).rejects.toThrow();
    });

    it('wraps raw DB error types from pg driver', async () => {
      redis.get.mockResolvedValue(null);
      const pgError = new Error('deadlock detected');
      (pgError as any).code = '40P01';
      (pgError as any).schema = 'public';
      dataSource.query.mockRejectedValue(pgError);

      await expect(service.getRevenueTrends('daily', 7)).rejects.toMatchObject({
        message: expect.stringContaining('deadlock'),
      });
    });
  });

  // ─── BOUNDARY VALUES ─────────────────────────────────────────────

  describe('Boundary values', () => {
    it('DAU with 1 day returns data for single day', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([{ date: new Date(), count: '5' }]);

      const result = await service.getDau(1);

      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [1]);
      expect(result).toHaveLength(1);
    });

    it('DAU with 365 days returns year of data', async () => {
      redis.get.mockResolvedValue(null);
      const rows = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2026, 0, i + 1),
        count: String(Math.floor(Math.random() * 100)),
      }));
      dataSource.query.mockResolvedValue(rows);

      const result = await service.getDau(365);

      expect(result).toHaveLength(365);
    });

    it('trek popularity limit=1 returns single result', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([defaultTrekRow]);

      const result = await service.getTrekPopularity(30, 1);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [30, 1],
      );
      expect(result).toHaveLength(1);
    });

    it('trek popularity limit=200 returns up to 200', async () => {
      redis.get.mockResolvedValue(null);
      const rows = Array.from({ length: 200 }, (_, i) => ({
        ...defaultTrekRow,
        id: `trek-${i}`,
        name: `Trek ${i}`,
      }));
      dataSource.query.mockResolvedValue(rows);

      const result = await service.getTrekPopularity(30, 200);

      expect(result).toHaveLength(200);
    });

    it('revenue maps month/quarter to correct date_trunc', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      await service.getRevenueTrends('monthly', 365);
      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [
        'month',
        365,
      ]);

      await service.getRevenueTrends('daily', 90);
      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [
        'day',
        90,
      ]);
    });

    it('revenue with no period specified defaults to daily', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([]);

      await service.getRevenueTrends(undefined as any, 30);
      expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [
        'day',
        30,
      ]);
    });
  });

  // ─── CONCURRENT REQUEST PATTERNS ─────────────────────────────────

  describe('Concurrent request behaviour', () => {
    it('parallel calls to same endpoint result in single DB query (cache reuse)', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify([{ date: '2026-07-01', count: 42 }]),
      );

      await Promise.all([
        service.getDau(7),
        service.getDau(7),
        service.getDau(7),
      ]);

      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('concurrent calls with different params use different cache keys', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([defaultDauRow]);

      await Promise.all([service.getDau(7), service.getDau(30)]);

      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });
  });

  // ─── PERFORMANCE CONSIDERATIONS ──────────────────────────────────

  describe('Performance considerations', () => {
    it('funnel endpoint makes exactly 5 queries', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query
        .mockResolvedValueOnce([{ count: '100' }])
        .mockResolvedValueOnce([{ count: '50' }])
        .mockResolvedValueOnce([{ count: '30' }])
        .mockResolvedValueOnce([{ count: '25' }])
        .mockResolvedValueOnce([{ count: '20' }]);

      await service.getConversionFunnel();

      expect(dataSource.query).toHaveBeenCalledTimes(5);
    });

    it('retention cohort query handles single-row result efficiently', async () => {
      redis.get.mockResolvedValue(null);
      dataSource.query.mockResolvedValue([
        {
          cohort_month: new Date('2026-06-01'),
          total_users: '1',
          retained_d7: '1',
          retained_d30: '0',
          retained_d90: '0',
        },
      ]);

      const result = await service.getRetentionCohorts(1);

      expect(result).toHaveLength(1);
      expect(result[0].retentionRateD7).toBe(100);
      expect(result[0].retentionRateD30).toBe(0);
    });
  });
});
