import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupStatusColumn0053 implements MigrationInterface {
  name = 'AddGroupStatusColumn0053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trek_groups
        ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_groups_status ON trek_groups (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_trek_groups_status`);
    await queryRunner.query(`ALTER TABLE trek_groups DROP COLUMN IF EXISTS status`);
  }
}
