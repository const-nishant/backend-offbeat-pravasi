import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminCalendarService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getCalendar() {
    const sql = `
      SELECT date, type, title, description, status FROM (
        SELECT
          c.start_date AS date,
          'coupon' AS type,
          c.code AS title,
          c.description AS description,
          CASE WHEN c.is_active AND c.end_date >= NOW() THEN 'active'
               WHEN c.end_date < NOW() THEN 'expired'
               ELSE 'scheduled' END AS status
        FROM coupons c
        UNION ALL
        SELECT
          b.start_date,
          'banner',
          b.title,
          b.subtitle,
          CASE WHEN b.is_active AND b.end_date >= NOW() THEN 'active'
               WHEN b.end_date < NOW() THEN 'expired'
               ELSE 'scheduled' END
        FROM promotional_banners b
        UNION ALL
        SELECT
          pc.start_date,
          'pricing_campaign',
          pc.name,
          pc.discount_type || ' ' || pc.discount_value::text,
          CASE WHEN pc.is_active AND pc.end_date >= NOW() THEN 'active'
               WHEN pc.end_date < NOW() THEN 'expired'
               ELSE 'scheduled' END
        FROM pricing_campaigns pc
        UNION ALL
        SELECT
          tc.created_at,
          'collection',
          tc.name,
          tc.description,
          CASE WHEN tc.is_active THEN 'active' ELSE 'inactive' END
        FROM trek_collections tc
      ) AS events
      ORDER BY date DESC
    `;

    const rows = await this.dataSource.query(sql);
    return rows.map((r: any) => ({
      date: r.date,
      type: r.type,
      title: r.title,
      description: r.description,
      status: r.status,
    }));
  }
}
