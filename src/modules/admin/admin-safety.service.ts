import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminSafetyService {
  private readonly logger = new Logger(AdminSafetyService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listIncidents(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const rows = await this.dataSource.query(
      `SELECT
         tci.id,
         tci.booking_id,
         tci.user_id,
         tci.status,
         tci.checked_in_at,
         tci.checked_out_at,
         tci.expected_check_out_at,
         tci.escalated_at,
         tci.resolved_at,
         tci.created_at
       FROM trek_check_ins tci
       WHERE tci.status IN ('ACTIVE', 'ESCALATED')
          OR tci.expected_check_out_at < NOW()
       ORDER BY
         CASE WHEN tci.expected_check_out_at < NOW() THEN 0 ELSE 1 END,
         tci.expected_check_out_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM trek_check_ins
       WHERE status IN ('ACTIVE', 'ESCALATED')
          OR expected_check_out_at < NOW()`,
    );

    return {
      data: rows.map((r: any) => ({
        id: r.id,
        bookingId: r.booking_id,
        userId: r.user_id,
        status: r.status,
        checkedInAt: r.checked_in_at,
        checkedOutAt: r.checked_out_at,
        expectedCheckOutAt: r.expected_check_out_at,
        escalatedAt: r.escalated_at,
        resolvedAt: r.resolved_at,
        createdAt: r.created_at,
        isOverdue: r.expected_check_out_at
          ? new Date(r.expected_check_out_at) < new Date()
          : false,
      })),
      total: Number(countResult[0]?.total ?? 0),
      page,
      limit,
    };
  }

  async getIncident(id: string) {
    const rows = await this.dataSource.query(
      `SELECT
         tci.*,
         u.email AS user_email,
         u.full_name AS user_name,
         t.name AS trek_name
       FROM trek_check_ins tci
       LEFT JOIN users u ON u.id = tci.user_id
       LEFT JOIN bookings b ON b.id = tci.booking_id
       LEFT JOIN treks t ON t.id = b.trek_id
       WHERE tci.id = $1`,
      [id],
    );

    if (rows.length === 0) throw new NotFoundException('Incident not found');

    const r = rows[0];
    return {
      id: r.id,
      bookingId: r.booking_id,
      userId: r.user_id,
      userEmail: r.user_email,
      userName: r.user_name,
      trekName: r.trek_name,
      status: r.status,
      checkedInAt: r.checked_in_at,
      checkedOutAt: r.checked_out_at,
      expectedCheckOutAt: r.expected_check_out_at,
      escalatedAt: r.escalated_at,
      resolvedAt: r.resolved_at,
      createdAt: r.created_at,
    };
  }

  async resolve(id: string, resolutionNote: string) {
    const result = await this.dataSource.query(
      `UPDATE trek_check_ins
       SET status = 'RESOLVED', resolved_at = NOW()
       WHERE id = $1 AND status IN ('ACTIVE', 'ESCALATED')
       RETURNING id`,
      [id],
    );

    if (result.length === 0)
      throw new NotFoundException('Incident not found or already resolved');
    this.logger.log(`Resolved safety incident: ${id}`);
    return { success: true, id, note: resolutionNote };
  }
}
