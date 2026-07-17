import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminSlaService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async overview() {
    const rows = await this.dataSource.query(`
      SELECT
        type,
        COUNT(*) AS total_tickets,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))::int AS avg_response_seconds
      FROM admin_tasks
      WHERE resolved_at IS NOT NULL
      GROUP BY type
    `);
    return rows.map((r: any) => ({
      type: r.type,
      totalTickets: Number(r.total_tickets),
      avgResponseSeconds: Number(r.avg_response_seconds),
      avgResponseHours: (Number(r.avg_response_seconds) / 3600).toFixed(1),
    }));
  }

  async byAdmin() {
    return this.dataSource.query(`
      SELECT
        t.assigned_to,
        COUNT(*) AS total_tasks,
        AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)))::int AS avg_response_seconds
      FROM admin_tasks t
      WHERE t.assigned_to IS NOT NULL AND t.resolved_at IS NOT NULL
      GROUP BY t.assigned_to
      ORDER BY avg_response_seconds ASC
    `);
  }

  async breaches(thresholdHours?: number) {
    const hours = thresholdHours ?? 48;
    return this.dataSource.query(
      `SELECT
         t.id,
         t.type,
         t.assigned_to,
         t.created_at,
         t.resolved_at,
         EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at)) / 3600 AS response_hours
       FROM admin_tasks t
       WHERE t.resolved_at IS NULL
          OR (t.resolved_at - t.created_at) > INTERVAL '1 hour' * $1
       ORDER BY response_hours DESC`,
      [hours],
    );
  }
}
