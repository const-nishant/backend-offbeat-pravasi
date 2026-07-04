import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundAuditToPayments0025 implements MigrationInterface {
  name = 'AddRefundAuditToPayments0025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS "refundAudit" jsonb;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payments DROP COLUMN IF EXISTS "refundAudit";`,
    );
  }
}
