import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminRefundAnalyticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async overview() {
    const rows = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total_refunded_count,
        COALESCE(SUM(amount_inr), 0) AS total_refunded_amount,
        (SELECT COUNT(*) FROM payments WHERE status = 'SUCCEEDED') AS total_succeeded
      FROM payments
      WHERE status = 'REFUNDED'
    `);
    const r = rows[0];
    const totalSucceeded = Number(r.total_succeeded);
    const totalRefunded = Number(r.total_refunded_count);
    return {
      totalRefundedCount: totalRefunded,
      totalRefundedAmount: Number(r.total_refunded_amount),
      totalSucceeded,
      refundRate:
        totalSucceeded > 0
          ? ((totalRefunded / totalSucceeded) * 100).toFixed(2) + '%'
          : '0%',
      avgRefundAmount:
        totalRefunded > 0
          ? Math.round(Number(r.total_refunded_amount) / totalRefunded)
          : 0,
    };
  }

  async byTrek() {
    return this.dataSource.query(`
      SELECT
        t.id AS trek_id,
        t.name AS trek_name,
        COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED') AS refund_count,
        COUNT(p.id) AS total_bookings,
        COALESCE(SUM(p.amount_inr) FILTER (WHERE p.status = 'REFUNDED'), 0) AS refunded_amount,
        ROUND(
          COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED')::numeric /
          NULLIF(COUNT(p.id), 0) * 100, 2
        ) AS refund_rate
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN treks t ON t.id = b.trek_id
      GROUP BY t.id, t.name
      ORDER BY refund_rate DESC
    `);
  }

  async byOrganizer() {
    return this.dataSource.query(`
      SELECT
        oa.id AS organizer_id,
        u.email AS organizer_email,
        u.full_name AS organizer_name,
        COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED') AS refund_count,
        COUNT(p.id) AS total_bookings,
        ROUND(
          COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED')::numeric /
          NULLIF(COUNT(p.id), 0) * 100, 2
        ) AS refund_rate
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN organizer_applications oa ON oa.user_id = b.organizer_id
      JOIN users u ON u.id = oa.user_id
      GROUP BY oa.id, u.email, u.full_name
      ORDER BY refund_rate DESC
    `);
  }

  async byUser() {
    return this.dataSource.query(`
      SELECT
        u.id AS user_id,
        u.email,
        u.full_name,
        COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED') AS refund_count,
        COUNT(p.id) AS total_payments,
        ROUND(
          COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED')::numeric /
          NULLIF(COUNT(p.id), 0) * 100, 2
        ) AS refund_rate
      FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN users u ON u.id = b.user_id
      GROUP BY u.id, u.email, u.full_name
      HAVING COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED') > 3
          OR (COUNT(p.id) FILTER (WHERE p.status = 'REFUNDED')::numeric /
              NULLIF(COUNT(p.id), 0) * 100) > 80
      ORDER BY refund_count DESC
    `);
  }

  async trend() {
    return this.dataSource.query(`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) FILTER (WHERE status = 'REFUNDED') AS refund_count,
        COUNT(*) AS total_payments,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'REFUNDED')::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) AS refund_rate
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);
  }
}
