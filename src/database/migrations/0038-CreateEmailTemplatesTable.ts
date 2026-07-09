import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailTemplatesTable0038 implements MigrationInterface {
  name = 'CreateEmailTemplatesTable0038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(100) NOT NULL,
        subject varchar(255) NOT NULL,
        body_html text NOT NULL,
        variables jsonb,
        is_active boolean NOT NULL DEFAULT true,
        version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_name
        ON email_templates (name)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_active
        ON email_templates (is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_templates`);
  }
}
