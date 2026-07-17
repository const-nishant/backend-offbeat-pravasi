import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminTaxService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async report(from: string, to: string) {
    const rows = await this.dataSource.query(
      `SELECT
         p.id,
         p.booking_id,
         p.amount_inr,
         p.created_at,
         b.user_id,
         b.trek_id,
         t.name AS trek_name
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       LEFT JOIN treks t ON t.id = b.trek_id
       WHERE p.status = 'SUCCEEDED'
         AND p.created_at >= $1
         AND p.created_at <= $2
       ORDER BY p.created_at DESC`,
      [from, to],
    );

    const totalRevenue = rows.reduce(
      (s: number, r: any) => s + Number(r.amount_inr),
      0,
    );
    const assumedTaxRate = 0.05;
    const taxCollected = Math.round(totalRevenue * assumedTaxRate);

    return {
      period: { from, to },
      totalRevenue,
      taxableAmount: totalRevenue,
      taxCollected,
      assumedTaxRate,
      bookingCount: rows.length,
      bookings: rows.map((r: any) => ({
        paymentId: r.id,
        bookingId: r.booking_id,
        userId: r.user_id,
        trekName: r.trek_name,
        amountInr: Number(r.amount_inr),
        estimatedGst: Math.round(Number(r.amount_inr) * assumedTaxRate),
        paidAt: r.created_at,
      })),
    };
  }
}
