import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeysTable0032 implements MigrationInterface {
  name = 'CreateApiKeysTable0032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key_hash varchar(64) NOT NULL,
        name varchar(120) NOT NULL,
        permissions text[] DEFAULT '{}',
        expires_at timestamptz,
        last_used_at timestamptz,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_key_hash
        ON api_keys (key_hash)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS api_keys`);
  }
}
