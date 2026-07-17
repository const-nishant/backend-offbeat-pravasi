import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminActivityService {
  private readonly logger = new Logger(AdminActivityService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getSummary() {
    const rows = await this.dataSource.query(
      `SELECT
         actor_id,
         actor_email,
         actor_role,
         COUNT(*) AS action_count,
         MAX(created_at) AS last_action
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY actor_id, actor_email, actor_role
       ORDER BY action_count DESC
       LIMIT 50`,
    );

    const today = await this.dataSource.query(
      `SELECT COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '24 hours'`,
    );

    const week = await this.dataSource.query(
      `SELECT COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'`,
    );

    return {
      totalToday: Number(today[0]?.count ?? 0),
      totalThisWeek: Number(week[0]?.count ?? 0),
      admins: rows.map((r: any) => ({
        actorId: r.actor_id,
        actorEmail: r.actor_email,
        actorRole: r.actor_role,
        actionCount: Number(r.action_count),
        lastAction: r.last_action,
      })),
    };
  }

  async getHeatmap() {
    const rows = await this.dataSource.query(
      `SELECT
         EXTRACT(DOW FROM created_at)::int AS day_of_week,
         EXTRACT(HOUR FROM created_at)::int AS hour_of_day,
         COUNT(*) AS action_count
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day_of_week, hour_of_day
       ORDER BY day_of_week, hour_of_day`,
    );

    return rows.map((r: any) => ({
      dayOfWeek: Number(r.day_of_week),
      hourOfDay: Number(r.hour_of_day),
      actionCount: Number(r.action_count),
    }));
  }

  async getRecent() {
    const rows = await this.dataSource.query(
      `SELECT
         id,
         actor_id,
         actor_email,
         actor_role,
         action,
         resource_type,
         resource_id,
         ip,
         user_agent,
         created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 50`,
    );

    return rows.map((r: any) => ({
      id: r.id,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      actorRole: r.actor_role,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      ip: r.ip,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));
  }
}
