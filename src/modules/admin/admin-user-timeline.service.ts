import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminUserTimelineService {
  private readonly logger = new Logger(AdminUserTimelineService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getTimeline(userId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const rows = await this.dataSource.query(
      `SELECT * FROM (
         SELECT
           'user_event' AS type,
           id,
           'account_created' AS action,
           NULL AS detail,
           created_at
         FROM users WHERE id = $1 AND created_at IS NOT NULL

         UNION ALL

         SELECT
           'booking' AS type,
           id,
           status AS action,
           jsonb_build_object(
             'trekId', trek_id,
             'totalAmountInr', total_amount_inr,
             'quantity', quantity
           ) AS detail,
           created_at
         FROM bookings WHERE user_id = $1

         UNION ALL

         SELECT
           'payment' AS type,
           id,
           status AS action,
           jsonb_build_object(
             'bookingId', booking_id,
             'amountInr', amount_inr,
             'provider', provider
           ) AS detail,
           created_at
         FROM payments WHERE booking_id IN (
           SELECT id FROM bookings WHERE user_id = $1
         )

         UNION ALL

         SELECT
           'audit_log' AS type,
           id,
           action,
           jsonb_build_object(
             'resourceType', resource_type,
             'resourceId', resource_id
           ) AS detail,
           created_at
         FROM audit_logs
         WHERE resource_id = $1 OR actor_id = $1
       ) AS timeline
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT created_at FROM users WHERE id = $1 AND created_at IS NOT NULL
         UNION ALL
         SELECT created_at FROM bookings WHERE user_id = $1
         UNION ALL
         SELECT created_at FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = $1)
         UNION ALL
         SELECT created_at FROM audit_logs WHERE resource_id = $1 OR actor_id = $1
       ) AS sub`,
      [userId],
    );

    const total = Number(countResult[0]?.total ?? 0);

    return {
      data: rows.map((r: any) => ({
        type: r.type,
        id: r.id,
        action: r.action,
        detail: r.detail,
        createdAt: r.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
