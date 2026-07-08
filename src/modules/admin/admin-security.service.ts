import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface FailedLoginFilters {
  userId?: string;
  ip?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AdminSecurityService {
  private readonly logger = new Logger(AdminSecurityService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listFailedLogins(filters: FailedLoginFilters) {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 0;

    if (filters.userId) {
      idx++;
      conditions.push(`fla.user_id = $${idx}`);
      params.push(filters.userId);
    }
    if (filters.ip) {
      idx++;
      conditions.push(`fla.ip = $${idx}`);
      params.push(filters.ip);
    }
    if (filters.from) {
      idx++;
      conditions.push(`fla.created_at >= $${idx}`);
      params.push(filters.from);
    }
    if (filters.to) {
      idx++;
      conditions.push(`fla.created_at <= $${idx}`);
      params.push(filters.to);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.dataSource.query(
      `SELECT
         fla.id,
         fla.user_id,
         fla.email,
         fla.ip,
         fla.user_agent,
         fla.reason,
         fla.created_at
       FROM failed_login_attempts fla
       ${where}
       ORDER BY fla.created_at DESC
       LIMIT 100`,
      params,
    );

    return rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      ip: r.ip,
      userAgent: r.user_agent,
      reason: r.reason,
      createdAt: r.created_at,
    }));
  }

  async getSummary() {
    const topIps = await this.dataSource.query(
      `SELECT
         ip,
         COUNT(*) AS attempt_count,
         MAX(created_at) AS last_attempt,
         MIN(created_at) AS first_attempt
       FROM failed_login_attempts
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY ip
       ORDER BY attempt_count DESC
       LIMIT 20`,
    );

    const topUsers = await this.dataSource.query(
      `SELECT
         COALESCE(user_id::text, email) AS identifier,
         COUNT(*) AS attempt_count,
         MAX(created_at) AS last_attempt
       FROM failed_login_attempts
       WHERE created_at >= NOW() - INTERVAL '7 days'
         AND (user_id IS NOT NULL OR email IS NOT NULL)
       GROUP BY identifier
       ORDER BY attempt_count DESC
       LIMIT 20`,
    );

    const trend = await this.dataSource.query(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*) AS attempt_count
       FROM failed_login_attempts
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY day
       ORDER BY day`,
    );

    return {
      topIps: topIps.map((r: any) => ({
        ip: r.ip,
        attemptCount: Number(r.attempt_count),
        lastAttempt: r.last_attempt,
        firstAttempt: r.first_attempt,
      })),
      topUsers: topUsers.map((r: any) => ({
        identifier: r.identifier,
        attemptCount: Number(r.attempt_count),
        lastAttempt: r.last_attempt,
      })),
      trend: trend.map((r: any) => ({
        day: r.day,
        attemptCount: Number(r.attempt_count),
      })),
    };
  }
}
