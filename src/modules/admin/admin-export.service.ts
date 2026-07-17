import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toCsv } from '../../common/utils/csv-export.util';

const EXPORT_LIMIT = 10000;

@Injectable()
export class AdminExportService {
  private readonly logger = new Logger(AdminExportService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async export(entity: string): Promise<{ csv: string; filename: string }> {
    const filename = `${entity}-${new Date().toISOString().split('T')[0]}`;

    switch (entity) {
      case 'users': {
        const rows = await this.dataSource.query(
          `SELECT id, email, full_name, username, phone, location, is_admin, is_suspended,
                  organizer_status, email_verified, created_at
           FROM users ORDER BY created_at DESC LIMIT $1`,
          [EXPORT_LIMIT],
        );
        return {
          csv: toCsv(rows, [
            'id',
            'email',
            'full_name',
            'username',
            'phone',
            'location',
            'is_admin',
            'is_suspended',
            'organizer_status',
            'email_verified',
            'created_at',
          ]),
          filename,
        };
      }

      case 'bookings': {
        const rows = await this.dataSource.query(
          `SELECT id, trek_id, user_id, quantity, unit_price_inr, total_amount_inr,
                  status, payment_id, created_at
           FROM bookings ORDER BY created_at DESC LIMIT $1`,
          [EXPORT_LIMIT],
        );
        return {
          csv: toCsv(rows, [
            'id',
            'trek_id',
            'user_id',
            'quantity',
            'unit_price_inr',
            'total_amount_inr',
            'status',
            'payment_id',
            'created_at',
          ]),
          filename,
        };
      }

      case 'payments': {
        const rows = await this.dataSource.query(
          `SELECT id, booking_id, provider, provider_payment_id, status, amount_inr,
                  currency, created_at
           FROM payments ORDER BY created_at DESC LIMIT $1`,
          [EXPORT_LIMIT],
        );
        return {
          csv: toCsv(rows, [
            'id',
            'booking_id',
            'provider',
            'provider_payment_id',
            'status',
            'amount_inr',
            'currency',
            'created_at',
          ]),
          filename,
        };
      }

      case 'treks': {
        const rows = await this.dataSource.query(
          `SELECT id, name, slug, difficulty, duration_days, max_altitude, state,
                  status, price_inr, max_participants, created_at
           FROM treks ORDER BY created_at DESC LIMIT $1`,
          [EXPORT_LIMIT],
        );
        return {
          csv: toCsv(rows, [
            'id',
            'name',
            'slug',
            'difficulty',
            'duration_days',
            'max_altitude',
            'state',
            'status',
            'price_inr',
            'max_participants',
            'created_at',
          ]),
          filename,
        };
      }

      default:
        return { csv: '', filename };
    }
  }
}
