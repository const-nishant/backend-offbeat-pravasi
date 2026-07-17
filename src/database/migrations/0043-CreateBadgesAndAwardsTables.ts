import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBadgesAndAwardsTables0043 implements MigrationInterface {
  name = 'CreateBadgesAndAwardsTables0043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(100) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        description text,
        icon_url text,
        category varchar(64),
        criteria jsonb,
        is_auto_awardable boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS badge_awards (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        badge_id uuid NOT NULL,
        user_id uuid NOT NULL,
        source varchar(64) NOT NULL DEFAULT 'auto',
        awarded_by uuid,
        reason text,
        awarded_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_badge_awards_unique
        ON badge_awards (badge_id, user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_badge_awards_badge
        ON badge_awards (badge_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_badge_awards_user
        ON badge_awards (user_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS badge_awards`);
    await queryRunner.query(`DROP TABLE IF EXISTS badges`);
  }
}
