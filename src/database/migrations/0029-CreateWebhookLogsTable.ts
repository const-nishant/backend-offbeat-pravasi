import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookLogsTable0029 implements MigrationInterface {
  name = 'CreateWebhookLogsTable0029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        provider varchar(20) NOT NULL,
        event_type varchar(100) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'processed',
        status_code integer,
        request_body text,
        response_body text,
        error text,
        duration_ms integer,
        retry_count integer NOT NULL DEFAULT 0,
        last_retry_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_created
        ON webhook_logs (provider, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_logs_status
        ON webhook_logs (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_logs`);
  }
}
