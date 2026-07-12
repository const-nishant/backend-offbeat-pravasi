import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGearReviewColumns0052 implements MigrationInterface {
  name = 'AddGearReviewColumns0052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE gear_items
        ADD COLUMN IF NOT EXISTS review_status varchar(16) NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE gear_items
        ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gear_review_status ON gear_items (review_status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_gear_review_status`);
    await queryRunner.query(
      `ALTER TABLE gear_items DROP COLUMN IF EXISTS featured`,
    );
    await queryRunner.query(
      `ALTER TABLE gear_items DROP COLUMN IF EXISTS review_status`,
    );
  }
}
