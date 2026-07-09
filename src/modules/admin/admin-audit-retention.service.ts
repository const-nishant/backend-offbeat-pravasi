import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { PlatformSettingsService } from './platform-settings.service';

@Injectable()
export class AdminAuditRetentionService {
  private readonly logger = new Logger(AdminAuditRetentionService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async getStats() {
    const tableInfo = await this.dataSource.query(
      `SELECT
         reltuples::bigint AS row_count,
         pg_size_pretty(pg_total_relation_size('audit_logs')) AS total_size,
         pg_size_pretty(pg_relation_size('audit_logs')) AS table_size,
         pg_size_pretty(pg_indexes_size('audit_logs')) AS index_size
       FROM pg_class
       WHERE relname = 'audit_logs'`,
    );

    const today = await this.dataSource.query(
      `SELECT COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '1 day'`,
    );

    const thisWeek = await this.dataSource.query(
      `SELECT COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '7 days'`,
    );

    const oldest = await this.dataSource.query(
      `SELECT MIN(created_at) AS oldest
       FROM audit_logs`,
    );

    const settings = await this.platformSettings.getSettings();

    return {
      rowCount: Number(tableInfo[0]?.row_count ?? 0),
      totalSize: tableInfo[0]?.total_size ?? 'unknown',
      tableSize: tableInfo[0]?.table_size ?? 'unknown',
      indexSize: tableInfo[0]?.index_size ?? 'unknown',
      last24hCount: Number(today[0]?.count ?? 0),
      last7dCount: Number(thisWeek[0]?.count ?? 0),
      oldestEntry: oldest[0]?.oldest ?? null,
      retentionDays: settings.auditLogRetentionDays ?? 365,
      exportBeforePurge: settings.auditLogExportBeforePurge ?? true,
    };
  }

  async updateRetention(dto: {
    retentionDays?: number;
    exportBeforePurge?: boolean;
  }) {
    const settings = await this.platformSettings.getSettings();

    const updated = {
      ...settings,
      ...(dto.retentionDays !== undefined
        ? { auditLogRetentionDays: dto.retentionDays }
        : {}),
      ...(dto.exportBeforePurge !== undefined
        ? { auditLogExportBeforePurge: dto.exportBeforePurge }
        : {}),
    };

    await this.platformSettings.updateSettings(updated);
    return updated;
  }

  async purgeNow() {
    const settings = await this.platformSettings.getSettings();
    const retentionDays = settings.auditLogRetentionDays ?? 365;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.auditLogRepo
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute();

    this.logger.log(
      `Purged ${result.affected ?? 0} audit log entries older than ${retentionDays} days`,
    );

    return {
      deletedCount: result.affected ?? 0,
      cutoffDate: cutoff.toISOString(),
      retentionDays,
    };
  }
}
