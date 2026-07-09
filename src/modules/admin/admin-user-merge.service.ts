import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface MergeResult {
  success: boolean;
  primaryUserId: string;
  mergedUserId: string;
  updates: Record<string, number>;
  deactivated: boolean;
}

@Injectable()
export class AdminUserMergeService {
  private readonly logger = new Logger(AdminUserMergeService.name);

  private readonly mergeTables: { table: string; fk: string; select?: string }[] = [
    { table: 'bookings', fk: 'user_id' },
    { table: 'bookings', fk: 'organizer_id' },
    { table: 'payments', fk: 'user_id' },
    { table: 'device_tokens', fk: 'user_id' },
    { table: 'notifications', fk: 'user_id' },
    { table: 'referral_codes', fk: 'user_id' },
    { table: 'referrals', fk: 'referrer_id' },
    { table: 'referrals', fk: 'referee_id' },
    { table: 'trek_check_ins', fk: 'user_id' },
    { table: 'wishlist_collections', fk: 'user_id' },
    { table: 'wishlist_items', fk: 'user_id' },
    { table: 'user_emergency_contacts', fk: 'user_id' },
    { table: 'user_sessions', fk: 'user_id' },
  ];

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async dryRun(primaryUserId: string, mergeUserId: string) {
    this.validateIds(primaryUserId, mergeUserId);

    const conflicts: Record<string, { primaryCount: number; mergeCount: number; tables: string[] }> = {};
    let totalUpdates = 0;

    for (const { table, fk } of this.mergeTables) {
      const countResult = await this.dataSource.query(
        `SELECT COUNT(*) AS cnt FROM ${table} WHERE ${fk} = $1`,
        [mergeUserId],
      );
      const count = Number(countResult[0]?.cnt ?? 0);
      if (count > 0) {
        const key = `${table}.${fk}`;
        const primaryResult = await this.dataSource.query(
          `SELECT COUNT(*) AS cnt FROM ${table} WHERE ${fk} = $1`,
          [primaryUserId],
        );
        conflicts[key] = {
          primaryCount: Number(primaryResult[0]?.cnt ?? 0),
          mergeCount: count,
          tables: [table],
        };
        totalUpdates += count;
      }
    }

    return {
      primaryUserId,
      mergeUserId,
      totalAffectedRows: totalUpdates,
      conflicts,
      hasRecordsToMigrate: Object.keys(conflicts).length > 0,
      primaryProfile: await this.getProfile(primaryUserId),
      mergeProfile: await this.getProfile(mergeUserId),
    };
  }

  async execute(primaryUserId: string, mergeUserId: string): Promise<MergeResult> {
    this.validateIds(primaryUserId, mergeUserId);

    if (primaryUserId === mergeUserId) {
      throw new BadRequestException('Cannot merge a user into themselves');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const updates: Record<string, number> = {};

      for (const { table, fk } of this.mergeTables) {
        const result = await queryRunner.query(
          `UPDATE ${table} SET ${fk} = $1 WHERE ${fk} = $2`,
          [primaryUserId, mergeUserId],
        );
        if (result[1] > 0) {
          updates[`${table}.${fk}`] = result[1];
        }
      }

      await queryRunner.query(
        `UPDATE users SET is_merged = true, merged_into = $1 WHERE id = $2`,
        [primaryUserId, mergeUserId],
      );

      await queryRunner.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
         VALUES ($1, 'merge_users', 'users', $2, $3, NOW())`,
        [
          primaryUserId,
          mergeUserId,
          JSON.stringify({ primaryUserId, mergedUserId: mergeUserId, updates }),
        ],
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Merged user ${mergeUserId} into ${primaryUserId}`);
      return { success: true, primaryUserId, mergedUserId: mergeUserId, updates, deactivated: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Merge failed: ${(err as Error).message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async history() {
    return this.dataSource.query(
      `SELECT id, actor_id, action, entity_type, entity_id, metadata, created_at
       FROM audit_logs
       WHERE action = 'merge_users'
       ORDER BY created_at DESC
       LIMIT 50`,
    );
  }

  private validateIds(...ids: string[]) {
    for (const id of ids) {
      if (!id || id.length < 10) throw new BadRequestException('Invalid user ID');
    }
  }

  private async getProfile(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT id, email, full_name, phone, avatar_url, is_merged, merged_into
       FROM users WHERE id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }
}
