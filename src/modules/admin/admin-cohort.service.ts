import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CohortExport } from './entities/cohort-export.entity';

@Injectable()
export class AdminCohortService {
  private readonly logger = new Logger(AdminCohortService.name);

  constructor(
    @InjectRepository(CohortExport)
    private readonly repo: Repository<CohortExport>,
    private readonly dataSource: DataSource,
  ) {}

  private readonly allowedFields = [
    'email', 'full_name', 'phone', 'id', 'total_treks', 'last_booking_date',
  ];

  async build(filters: {
    minTreks?: number;
    lastBookingBefore?: string;
    lastBookingAfter?: string;
    states?: string[];
    isOrganizer?: boolean;
    isSuspended?: boolean;
    format?: string;
  }) {
    const format = filters.format === 'json' ? 'json' : 'csv';
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let idx = 1;

    if (filters.minTreks !== undefined) {
      conditions.push(`bb.trek_count >= $${idx++}`);
      params.push(filters.minTreks);
    }
    if (filters.lastBookingBefore) {
      conditions.push(`bb.last_booking_date <= $${idx++}`);
      params.push(filters.lastBookingBefore);
    }
    if (filters.lastBookingAfter) {
      conditions.push(`bb.last_booking_date >= $${idx++}`);
      params.push(filters.lastBookingAfter);
    }
    if (filters.states?.length) {
      conditions.push(`u.state = ANY($${idx++})`);
      params.push(filters.states);
    }
    if (filters.isOrganizer) {
      conditions.push(`u.role = 'organizer'`);
    }
    if (filters.isSuspended) {
      conditions.push(`u.is_suspended = true`);
    }

    const sql = `
      SELECT u.email, u.full_name, u.phone, u.id AS user_id,
             COALESCE(bb.trek_count, 0) AS total_treks,
             bb.last_booking_date
      FROM users u
      LEFT JOIN (
        SELECT b.user_id,
               COUNT(*) AS trek_count,
               MAX(b.created_at) AS last_booking_date
        FROM bookings b
        GROUP BY b.user_id
      ) bb ON bb.user_id = u.id
      WHERE ${conditions.join(' AND ')}
      LIMIT 50000
    `;

    const rows = await this.dataSource.query(sql, params);
    const rowCount = rows.length;

    const exportRecord = this.repo.create({
      filters: filters as any,
      format,
      rowCount,
      status: 'completed',
    });
    const saved = await this.repo.save(exportRecord);

    this.logger.log(`Built cohort export: ${saved.id} (${rowCount} rows)`);

    const data = rows.map((r: any) => ({
      email: r.email,
      name: r.full_name,
      phone: r.phone,
      userId: r.user_id,
      totalTreks: Number(r.total_treks),
      lastBookingDate: r.last_booking_date,
    }));

    return {
      id: saved.id,
      rowCount,
      format,
      data: format === 'json' ? data : this.toCsv(data),
    };
  }

  async history() {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: 50 });
  }

  private toCsv(data: Record<string, unknown>[]): string {
    const headers = Object.keys(data[0] ?? {});
    const lines = data.map((row) =>
      headers.map((h) => {
        const v = row[h];
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','),
    );
    return [headers.join(','), ...lines].join('\n');
  }
}
