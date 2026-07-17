import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupModerationColumns0053 implements MigrationInterface {
  name = 'AddGroupModerationColumns0053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trek_groups
        ADD COLUMN IF NOT EXISTS moderation_status varchar(16) NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      ALTER TABLE trek_groups
        ADD COLUMN IF NOT EXISTS ban_reason text
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_groups_moderation
        ON trek_groups (moderation_status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_trek_groups_moderation`);
    await queryRunner.query(
      `ALTER TABLE trek_groups DROP COLUMN IF EXISTS ban_reason`,
    );
    await queryRunner.query(
      `ALTER TABLE trek_groups DROP COLUMN IF EXISTS moderation_status`,
    );
  }
}
