import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminGearService {
  private readonly logger = new Logger(AdminGearService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listPending(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await this.dataSource.query(
      `SELECT id, name, category, review_status, featured, is_active, created_at
       FROM gear_items
       WHERE review_status = 'pending'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM gear_items WHERE review_status = 'pending'`,
    );
    return {
      data: rows,
      total: Number(countResult[0]?.total ?? 0),
      page,
      limit,
    };
  }

  async decide(id: string, decision: 'approved' | 'rejected', reason?: string) {
    const result = await this.dataSource.query(
      `UPDATE gear_items SET review_status = $1 WHERE id = $2 RETURNING id`,
      [decision, id],
    );
    if (result.length === 0) throw new NotFoundException('Gear item not found');
    this.logger.log(`Gear ${id} → ${decision}`);
    return { success: true, id, decision, reason };
  }

  async toggleFeatured(id: string) {
    const item = await this.dataSource.query(
      `SELECT featured FROM gear_items WHERE id = $1`,
      [id],
    );
    if (item.length === 0) throw new NotFoundException('Gear item not found');
    const newFeatured = !item[0].featured;
    await this.dataSource.query(
      `UPDATE gear_items SET featured = $1 WHERE id = $2`,
      [newFeatured, id],
    );
    return { success: true, id, featured: newFeatured };
  }

  async softDelete(id: string) {
    const result = await this.dataSource.query(
      `UPDATE gear_items SET is_active = false, review_status = 'rejected' WHERE id = $1 RETURNING id`,
      [id],
    );
    if (result.length === 0) throw new NotFoundException('Gear item not found');
    this.logger.log(`Soft-deleted gear: ${id}`);
    return { success: true, id };
  }
}
