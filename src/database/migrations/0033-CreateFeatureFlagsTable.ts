import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureFlagsTable0033 implements MigrationInterface {
  name = 'CreateFeatureFlagsTable0033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key varchar(80) NOT NULL,
        description text,
        enabled boolean NOT NULL DEFAULT false,
        percentage integer NOT NULL DEFAULT 100,
        user_segment varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_key
        ON feature_flags (key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS feature_flags`);
  }
}
