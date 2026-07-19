import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminModerationColumns1784489848000
  implements MigrationInterface
{
  name = 'AddAdminModerationColumns1784489848000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ponytail: admin moderation features (gear review/featured, group moderation)
    // were built against columns that were never migrated. Add them to unblock the
    // admin endpoints. Reversible via down().
    await queryRunner.query(
      `ALTER TABLE "gear_items" ADD COLUMN "review_status" character varying(16) NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "gear_items" ADD COLUMN "featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_groups" ADD COLUMN "moderation_status" character varying(16) NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_groups" ADD COLUMN "ban_reason" character varying(512)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trek_groups" DROP COLUMN "ban_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_groups" DROP COLUMN "moderation_status"`,
    );
    await queryRunner.query(`ALTER TABLE "gear_items" DROP COLUMN "featured"`);
    await queryRunner.query(
      `ALTER TABLE "gear_items" DROP COLUMN "review_status"`,
    );
  }
}
