import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsEventsTable0027 implements MigrationInterface {
  name = 'CreateAnalyticsEventsTable0027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        event varchar(64) NOT NULL,
        properties jsonb,
        ip_address varchar(45),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
        ON analytics_events (user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created
        ON analytics_events (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_event
        ON analytics_events (event, created_at DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE analytics_events
        ADD CONSTRAINT fk_analytics_events_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_events`);
  }
}
