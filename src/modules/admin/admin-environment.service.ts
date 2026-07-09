import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';

const ENV_WHITELIST = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'STORAGE_ENDPOINT',
  'STORAGE_BUCKET',
  'APP_URL',
  'NODE_ENV',
  'BETTER_AUTH_BASE_URL',
];

@Injectable()
export class AdminEnvironmentService {
  private readonly logger = new Logger(AdminEnvironmentService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(FeatureFlag)
    private readonly flagRepo: Repository<FeatureFlag>,
  ) {}

  async compare() {
    const platformSettings = await this.dataSource.query(
      `SELECT key, settings FROM platform_settings LIMIT 1`,
    );

    const featureFlags = await this.flagRepo.find({
      order: { key: 'ASC' },
    });

    const envVars: Record<string, string | undefined> = {};
    for (const key of ENV_WHITELIST) {
      envVars[key] = process.env[key] ?? '(not set)';
    }

    return {
      platformSettings: platformSettings[0]?.settings ?? {},
      featureFlags: featureFlags.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        percentage: f.percentage,
      })),
      environmentVariables: envVars,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  async getDriftReport() {
    const logs = await this.dataSource.query(
      `SELECT
         id,
         actor_id,
         action,
         detail,
         created_at
       FROM audit_logs
       WHERE action IN ('PLATFORM_SETTINGS_UPDATE', 'FEATURE_FLAG_UPDATE')
       ORDER BY created_at DESC
       LIMIT 50`,
    );

    return logs.map((r: any) => ({
      id: r.id,
      actorId: r.actor_id,
      action: r.action,
      detail: r.detail,
      createdAt: r.created_at,
    }));
  }
}
