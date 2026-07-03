import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/utils/redis.service';
import { CacheKeys } from '../../common/constants/cache.keys';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  private async readCached<T>(key: string): Promise<T | null> {
    const raw = await this.redisService.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Corrupted cache entry for key ${key}, skipping`);
      return null;
    }
  }

  async getDau(days: number) {
    const cacheKey = CacheKeys.analyticsDau(days);
    const cached =
      await this.readCached<{ date: Date; count: number }[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.dataSource.query(
      `
      SELECT DATE_TRUNC('day', created_at) AS date,
             COUNT(DISTINCT user_id) AS count
      FROM analytics_events
      WHERE created_at >= NOW() - ($1::int || ' days')::interval
      GROUP BY 1
      ORDER BY 1 ASC
      `,
      [days],
    );

    const result = rows.map((r: any) => ({
      date: r.date,
      count: Number(r.count),
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async getTrekPopularity(days: number, limit: number) {
    const cacheKey = CacheKeys.analyticsTrekPopularity(days, limit);
    const cached = await this.readCached<any[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.dataSource.query(
      `
      SELECT t.id,
             t.name,
             t.state,
             t.difficulty,
             COUNT(DISTINCT ti.user_id) AS total_users,
             COUNT(CASE WHEN ti.type = 'VIEW' THEN 1 END) AS views,
             COUNT(CASE WHEN ti.type = 'BOOKMARK' THEN 1 END) AS bookmarks,
             COUNT(CASE WHEN ti.type = 'LIKE' THEN 1 END) AS likes,
             COUNT(CASE WHEN ti.type = 'BOOKING' THEN 1 END) AS bookings
      FROM trek_interactions ti
      JOIN treks t ON t.id = ti.trek_id
      WHERE ti.created_at >= NOW() - ($1::int || ' days')::interval
      GROUP BY t.id, t.name, t.state, t.difficulty
      ORDER BY views DESC
      LIMIT $2
      `,
      [days, limit],
    );

    const result = rows.map((r: any) => ({
      trekId: r.id,
      name: r.name,
      state: r.state,
      difficulty: r.difficulty,
      views: Number(r.views),
      bookmarks: Number(r.bookmarks),
      likes: Number(r.likes),
      bookings: Number(r.bookings),
      totalUsers: Number(r.total_users),
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  async getConversionFunnel(
    startDate?: string,
    endDate?: string,
    trekId?: string,
  ) {
    const cacheKey = CacheKeys.analyticsFunnel(startDate, endDate, trekId);
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (startDate) {
      conditions.push(`ti.created_at >= $${paramIdx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`ti.created_at <= $${paramIdx++}`);
      params.push(endDate);
    }
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const viewsQ = `SELECT COUNT(DISTINCT user_id) FROM trek_interactions ti ${whereClause}`;
    const bookingsQ = `SELECT COUNT(DISTINCT user_id) FROM bookings b ${whereClause.replace('ti.', 'b.')}`;
    const paymentsQ = `SELECT COUNT(DISTINCT b.user_id) FROM payments p JOIN bookings b ON b.id = p.booking_id ${whereClause.replace('ti.', 'p.')}`;
    const completedQ = `SELECT COUNT(DISTINCT b.user_id) FROM payments p JOIN bookings b ON b.id = p.booking_id ${whereClause.replace('ti.', 'p.')} AND p.status = 'SUCCEEDED'`;
    const confirmedQ = `SELECT COUNT(DISTINCT user_id) FROM bookings b ${whereClause.replace('ti.', 'b.')} AND b.status = 'CONFIRMED'`;

    const [views, bookings, payments, completed, confirmed] = await Promise.all(
      [
        this.dataSource.query(viewsQ, params),
        this.dataSource.query(bookingsQ, params),
        this.dataSource.query(paymentsQ, params),
        this.dataSource.query(completedQ, params),
        this.dataSource.query(confirmedQ, params),
      ],
    );

    const result = {
      period: { startDate: startDate ?? null, endDate: endDate ?? null },
      stages: {
        views: Number(views[0]?.count ?? 0),
        bookingsStarted: Number(bookings[0]?.count ?? 0),
        paymentsInitiated: Number(payments[0]?.count ?? 0),
        paymentsCompleted: Number(completed[0]?.count ?? 0),
        bookingsConfirmed: Number(confirmed[0]?.count ?? 0),
      },
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 900);
    return result;
  }

  async getRevenueTrends(period: string, days: number) {
    const cacheKey = CacheKeys.analyticsRevenue(period, days);
    const cached = await this.readCached<any[]>(cacheKey);
    if (cached) return cached;

    const truncMap: Record<string, string> = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
    };
    const trunc = truncMap[period] ?? 'day';

    const rows = await this.dataSource.query(
      `
      SELECT DATE_TRUNC($1, p.created_at) AS date,
             p.provider,
             COUNT(p.id) AS transaction_count,
             SUM(p.amount_inr) AS revenue,
             COUNT(DISTINCT b.user_id) AS active_users
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      WHERE p.status = 'SUCCEEDED'
        AND p.created_at >= NOW() - ($2::int || ' days')::interval
      GROUP BY 1, p.provider
      ORDER BY 1 ASC, p.provider
      `,
      [trunc, days],
    );

    const result = rows.map((r: any) => ({
      date: r.date,
      provider: r.provider,
      transactionCount: Number(r.transaction_count),
      revenue: Number(r.revenue),
      activeUsers: Number(r.active_users),
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 600);
    return result;
  }

  async getRetentionCohorts(months: number) {
    const cacheKey = CacheKeys.analyticsRetention(months);
    const cached = await this.readCached<any[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.dataSource.query(
      `
      WITH cohorts AS (
        SELECT
          id,
          DATE_TRUNC('month', created_at) AS cohort_month,
          created_at::date AS signup_date
        FROM users
        WHERE created_at >= NOW() - ($1::int || ' months')::interval
      ),
      user_activity AS (
        SELECT DISTINCT user_id, created_at::date AS activity_date
        FROM analytics_events
        WHERE created_at >= NOW() - ($1::int || ' months')::interval
      )
      SELECT
        c.cohort_month,
        COUNT(DISTINCT c.id) AS total_users,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.signup_date + 7
                             AND ua.activity_date < c.signup_date + 14 THEN c.id END) AS retained_d7,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.signup_date + 30
                             AND ua.activity_date < c.signup_date + 60 THEN c.id END) AS retained_d30,
        COUNT(DISTINCT CASE WHEN ua.activity_date >= c.signup_date + 90 THEN c.id END) AS retained_d90
      FROM cohorts c
      LEFT JOIN user_activity ua ON ua.user_id = c.id
      GROUP BY c.cohort_month
      ORDER BY c.cohort_month DESC
      `,
      [months],
    );

    const result = rows.map((r: any) => ({
      cohortMonth: r.cohort_month,
      totalUsers: Number(r.total_users),
      retainedD7: Number(r.retained_d7),
      retentionRateD7:
        Number(r.total_users) > 0
          ? Math.round(
              (Number(r.retained_d7) / Number(r.total_users)) * 10000,
            ) / 100
          : 0,
      retainedD30: Number(r.retained_d30),
      retentionRateD30:
        Number(r.total_users) > 0
          ? Math.round(
              (Number(r.retained_d30) / Number(r.total_users)) * 10000,
            ) / 100
          : 0,
      retainedD90: Number(r.retained_d90),
      retentionRateD90:
        Number(r.total_users) > 0
          ? Math.round(
              (Number(r.retained_d90) / Number(r.total_users)) * 10000,
            ) / 100
          : 0,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(result), 900);
    return result;
  }
}
