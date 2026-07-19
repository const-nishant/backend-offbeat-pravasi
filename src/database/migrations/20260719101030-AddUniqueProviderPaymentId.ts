import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueProviderPaymentId20260719101030
  implements MigrationInterface
{
  name = 'AddUniqueProviderPaymentId20260719101030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_payments_provider_payment_id" ON "payments" ("providerPaymentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "idx_payments_provider_payment_id"`,
    );
  }
}
