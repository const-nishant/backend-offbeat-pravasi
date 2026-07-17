import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const DEFAULT_COMMISSION_RATE = 0.1;

@Injectable()
export class AdminRevenueService {
  private readonly logger = new Logger(AdminRevenueService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getOverview() {
    const rows = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(b.total_amount_inr), 0) AS total_revenue,
         COALESCE(COUNT(b.id), 0) AS booking_count
       FROM bookings b
       WHERE b.status = 'CONFIRMED'`,
    );

    const totalRevenue = Number(rows[0]?.total_revenue ?? 0);
    const bookingCount = Number(rows[0]?.booking_count ?? 0);
    const platformShare = Math.round(totalRevenue * DEFAULT_COMMISSION_RATE);
    const organizerShare = totalRevenue - platformShare;

    return {
      totalRevenue,
      platformShare,
      organizerShare,
      commissionRate: DEFAULT_COMMISSION_RATE,
      bookingCount,
    };
  }

  async getByTrek() {
    const rows = await this.dataSource.query(
      `SELECT
         b.trek_id AS trek_id,
         t.name AS trek_name,
         COUNT(b.id) AS booking_count,
         COALESCE(SUM(b.total_amount_inr), 0) AS total_revenue
       FROM bookings b
       LEFT JOIN treks t ON t.id = b.trek_id
       WHERE b.status = 'CONFIRMED'
       GROUP BY b.trek_id, t.name
       ORDER BY total_revenue DESC`,
    );

    return rows.map((r: any) => {
      const totalRevenue = Number(r.total_revenue);
      const platformShare = Math.round(totalRevenue * DEFAULT_COMMISSION_RATE);
      const organizerShare = totalRevenue - platformShare;

      return {
        trekId: r.trek_id,
        trekName: r.trek_name,
        totalRevenue,
        platformShare,
        organizerShare,
        bookingCount: Number(r.booking_count),
      };
    });
  }

  async getByOrganizer() {
    const rows = await this.dataSource.query(
      `SELECT
         t.organizer_id AS organizer_id,
         u.email AS organizer_email,
         u.full_name AS organizer_name,
         COUNT(b.id) AS booking_count,
         COALESCE(SUM(b.total_amount_inr), 0) AS total_revenue
       FROM bookings b
       JOIN treks t ON t.id = b.trek_id
       LEFT JOIN users u ON u.id = t.organizer_id
       WHERE b.status = 'CONFIRMED'
         AND t.organizer_id IS NOT NULL
       GROUP BY t.organizer_id, u.email, u.full_name
       ORDER BY total_revenue DESC`,
    );

    return rows.map((r: any) => {
      const totalRevenue = Number(r.total_revenue);
      const platformShare = Math.round(totalRevenue * DEFAULT_COMMISSION_RATE);
      const organizerShare = totalRevenue - platformShare;

      return {
        organizerId: r.organizer_id,
        organizerEmail: r.organizer_email,
        organizerName: r.organizer_name,
        totalRevenue,
        platformShare,
        organizerShare,
        bookingCount: Number(r.booking_count),
      };
    });
  }
}
