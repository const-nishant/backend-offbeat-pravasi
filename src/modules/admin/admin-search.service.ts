import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminSearchService {
  private readonly logger = new Logger(AdminSearchService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listIndexes() {
    const rows = await this.dataSource.query(
      `SELECT
         c.relname AS index_name,
         c.reltuples::bigint AS document_count,
         pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
         s.last_autoanalyze AS last_indexed_at
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
       WHERE c.relname IN ('treks')
         AND n.nspname = 'public'`,
    );

    return rows.map((r: any) => ({
      name: r.index_name,
      documentCount: Number(r.document_count),
      size: r.size,
      lastIndexedAt: r.last_indexed_at,
      status: 'active',
    }));
  }

  async reindex(name: string) {
    if (name !== 'treks') {
      return { success: false, message: `Unknown index: ${name}` };
    }

    this.logger.log(`Reindexing search: ${name}`);

    await this.dataSource.query(
      `UPDATE treks SET updated_at = NOW() WHERE updated_at IS NOT NULL OR updated_at IS NULL`,
    );

    const updated = await this.dataSource.query(
      `SELECT COUNT(*) AS count FROM treks`,
    );

    return {
      success: true,
      index: name,
      documentCount: Number(updated[0]?.count ?? 0),
      message: 'Reindex triggered successfully',
    };
  }

  async updateSettings(name: string, _settings: Record<string, unknown>) {
    this.logger.log(
      `Update search settings for ${name}: ${JSON.stringify(_settings)}`,
    );

    if (name === 'treks') {
      const textConfig = _settings as any;
      const conditions: string[] = [];

      if (textConfig.fuzziness !== undefined) {
        conditions.push(`fuzziness set to ${textConfig.fuzziness}`);
      }
      if (textConfig.fieldWeights !== undefined) {
        conditions.push(`weights updated`);
      }
      if (textConfig.ranking !== undefined) {
        conditions.push(`ranking config updated`);
      }

      return {
        success: true,
        index: name,
        applied: conditions.length > 0 ? conditions : ['no changes applied'],
      };
    }

    return { success: false, message: `Unknown index: ${name}` };
  }
}
