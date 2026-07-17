import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIpAccessRulesTable0031 implements MigrationInterface {
  name = 'CreateIpAccessRulesTable0031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ip_list_type AS ENUM ('blocklist', 'allowlist')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ip_access_rules (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        list_type ip_list_type NOT NULL,
        ip_cidr varchar(45) NOT NULL,
        reason text,
        expires_at timestamptz,
        hit_count integer NOT NULL DEFAULT 0,
        last_hit_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_access_rules_list_type
        ON ip_access_rules (list_type, expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ip_access_rules`);
    await queryRunner.query(`DROP TYPE IF EXISTS ip_list_type`);
  }
}
