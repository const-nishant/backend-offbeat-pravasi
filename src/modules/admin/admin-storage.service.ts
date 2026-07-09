import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminStorageService {
  private readonly logger = new Logger(AdminStorageService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getSummary() {
    const bucketStats = await this.dataSource.query(
      `SELECT
         bucket,
         COUNT(*)::int AS object_count,
         COALESCE(SUM(size_bytes), 0)::bigint AS total_size_bytes,
         pg_size_pretty(COALESCE(SUM(size_bytes), 0)::bigint) AS total_size
       FROM media
       GROUP BY bucket
       ORDER BY total_size_bytes DESC`,
    );

    const lastWeek = await this.dataSource.query(
      `SELECT
         bucket,
         COUNT(*)::int AS count
       FROM media
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY bucket`,
    );

    const totals = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS total_objects,
         COALESCE(SUM(size_bytes), 0)::bigint AS total_size_bytes,
         pg_size_pretty(COALESCE(SUM(size_bytes), 0)::bigint) AS total_size
       FROM media`,
    );

    const lastWeekMap = Object.fromEntries(
      lastWeek.map((r: any) => [r.bucket, Number(r.count)]),
    );

    return {
      totals: {
        objectCount: Number(totals[0]?.total_objects ?? 0),
        totalSize: totals[0]?.total_size ?? '0 bytes',
      },
      buckets: bucketStats.map((r: any) => ({
        bucket: r.bucket,
        objectCount: Number(r.object_count),
        totalSize: r.total_size,
        lastWeekGrowth: lastWeekMap[r.bucket] ?? 0,
      })),
    };
  }

  async getFileTypes() {
    const rows = await this.dataSource.query(
      `SELECT
         bucket,
         mime_type,
         COUNT(*)::int AS count,
         COALESCE(SUM(size_bytes), 0)::bigint AS total_size_bytes
       FROM media
       GROUP BY bucket, mime_type
       ORDER BY bucket, count DESC`,
    );

    return rows.map((r: any) => ({
      bucket: r.bucket,
      mimeType: r.mime_type,
      count: Number(r.count),
      totalSizeBytes: Number(r.total_size_bytes),
    }));
  }

  async getOrphans() {
    const orphans = await this.dataSource.query(
      `SELECT m.id, m.key, m.bucket, m.original_name, m.category, m.created_at
       FROM media m
       LEFT JOIN trek_images ti ON ti.image_id = m.id
       WHERE ti.image_id IS NULL
         AND m.category NOT IN ('PROFILE', 'BANNER')
       ORDER BY m.created_at DESC
       LIMIT 100`,
    );

    return orphans.map((r: any) => ({
      id: r.id,
      key: r.key,
      bucket: r.bucket,
      originalName: r.original_name,
      category: r.category,
      createdAt: r.created_at,
    }));
  }
}
