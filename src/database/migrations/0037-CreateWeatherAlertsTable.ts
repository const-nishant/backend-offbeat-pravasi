import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWeatherAlertsTable0037 implements MigrationInterface {
  name = 'CreateWeatherAlertsTable0037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE alert_severity AS ENUM ('ADVISORY', 'WATCH', 'WARNING')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS weather_alerts (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        title varchar(200) NOT NULL,
        body text NOT NULL,
        severity alert_severity NOT NULL DEFAULT 'ADVISORY',
        affected_region jsonb,
        is_active boolean NOT NULL DEFAULT true,
        expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_weather_alerts_severity
        ON weather_alerts (severity)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_weather_alerts_created
        ON weather_alerts (created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS weather_alerts`);
    await queryRunner.query(`DROP TYPE IF EXISTS alert_severity`);
  }
}
