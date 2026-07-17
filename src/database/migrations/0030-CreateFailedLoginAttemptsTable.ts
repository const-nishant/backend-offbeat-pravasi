import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFailedLoginAttemptsTable0030 implements MigrationInterface {
  name = 'CreateFailedLoginAttemptsTable0030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS failed_login_attempts (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid,
        email varchar(255),
        ip varchar(45) NOT NULL,
        user_agent varchar(255),
        reason text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_login_ip
        ON failed_login_attempts (ip)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_login_user
        ON failed_login_attempts (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_login_created
        ON failed_login_attempts (created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS failed_login_attempts`);
  }
}
