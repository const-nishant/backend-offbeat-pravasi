import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMetadataColumn0008 implements MigrationInterface {
  name = 'AddPaymentMetadataColumn0008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata jsonb;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payments DROP COLUMN IF EXISTS metadata;`,
    );
  }
}
