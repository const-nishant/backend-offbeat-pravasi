import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminDatabaseService {
  private readonly logger = new Logger(AdminDatabaseService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getHealth() {
    try {
      const result = await this.dataSource.query(
        `SELECT count(*) FILTER (WHERE state = 'active') AS active,
                count(*) FILTER (WHERE state = 'idle') AS idle,
                count(*) FILTER (WHERE wait_event IS NOT NULL) AS waiting,
                count(*) AS total
         FROM pg_stat_activity
         WHERE backend_type = 'client backend'`,
      );
      const row = result[0] ?? { active: 0, idle: 0, waiting: 0, total: 0 };
      const active = Number(row.active);
      const idle = Number(row.idle);
      const waiting = Number(row.waiting);
      const total = Number(row.total);
      const maxPoolSize = 25;
      return {
        active,
        idle,
        waiting,
        totalConnections: total,
        maxPoolSize,
        utilizationPercent: Math.round((active / maxPoolSize) * 100),
      };
    } catch {
      return {
        active: 0,
        idle: 0,
        waiting: 0,
        totalConnections: 0,
        maxPoolSize: 25,
        utilizationPercent: 0,
        note: 'pg_stat_activity not available (non-PostgreSQL or insufficient permissions)',
      };
    }
  }

  async getTables() {
    try {
      const rows = await this.dataSource.query(
        `SELECT relname AS table_name,
                n_live_tup AS row_count,
                pg_size_pretty(pg_table_size(relid)) AS table_size,
                pg_size_pretty(pg_indexes_size(relid)) AS index_size,
                n_dead_tup AS dead_tuples,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
         FROM pg_stat_user_tables
         ORDER BY n_live_tup DESC`,
      );
      return rows.map((r: any) => ({
        tableName: r.table_name,
        rowCount: Number(r.row_count),
        tableSize: r.table_size,
        indexSize: r.index_size,
        deadTuples: Number(r.dead_tuples),
        lastVacuum: r.last_vacuum,
        lastAutovacuum: r.last_autovacuum,
        lastAnalyze: r.last_analyze,
        lastAutoanalyze: r.last_autoanalyze,
      }));
    } catch {
      return [];
    }
  }

  async getIndexes() {
    try {
      const rows = await this.dataSource.query(
        `SELECT schemaname,
                relname AS tablename,
                indexrelname AS indexname,
                pg_get_indexdef(indexrelid) AS indexdef,
                pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
                idx_scan AS index_scans,
                idx_tup_read,
                idx_tup_fetch
         FROM pg_stat_user_indexes
         ORDER BY idx_scan ASC
         LIMIT 50`,
      );
      return rows.map((r: any) => ({
        schema: r.schemaname,
        table: r.tablename,
        indexName: r.indexname,
        indexDef: r.indexdef,
        indexSize: r.index_size,
        scans: Number(r.idx_scan),
        tuplesRead: Number(r.idx_tup_read),
        tuplesFetched: Number(r.idx_tup_fetch),
      }));
    } catch {
      return [];
    }
  }

  async getSlowQueries() {
    try {
      const rows = await this.dataSource.query(
        `SELECT queryid,
                query,
                calls,
                mean_exec_time AS mean_time_ms,
                total_exec_time AS total_time_ms,
                min_exec_time AS min_time_ms,
                max_exec_time AS max_time_ms,
                rows,
                shared_blks_hit,
                shared_blks_read
         FROM pg_stat_statements
         WHERE query NOT LIKE '%pg_stat%'
         ORDER BY mean_exec_time DESC
         LIMIT 10`,
      );
      return rows.map((r: any) => ({
        queryId: r.queryid,
        query: (r.query as string).substring(0, 500),
        calls: Number(r.calls),
        meanTimeMs: Math.round(Number(r.mean_time_ms) * 100) / 100,
        totalTimeMs: Math.round(Number(r.total_time_ms) * 100) / 100,
        minTimeMs: Math.round(Number(r.min_time_ms) * 100) / 100,
        maxTimeMs: Math.round(Number(r.max_time_ms) * 100) / 100,
        rows: Number(r.rows),
        cacheHits: Number(r.shared_blks_hit),
        cacheReads: Number(r.shared_blks_read),
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/pg_stat_statements/.test(msg)) {
        return {
          available: false,
          reason:
            'pg_stat_statements extension is not enabled. Enable it with: CREATE EXTENSION pg_stat_statements; (requires shared_preload_libraries=pg_stat_statements).',
        };
      }
      return { available: false, reason: msg };
    }
  }
}
