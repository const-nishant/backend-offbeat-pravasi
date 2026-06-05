import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsPaymentsAndSettings0005
  implements MigrationInterface
{
  name = 'CreateBookingsPaymentsAndSettings0005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trek_id uuid NOT NULL,
        trek_snapshot jsonb NOT NULL,
        user_id uuid NOT NULL,
        participants jsonb,
        quantity int NOT NULL,
        unit_price_inr int NOT NULL,
        total_amount_inr int NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'PENDING',
        payment_id uuid,
        hold_expires_at timestamptz,
        metadata jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id uuid NOT NULL,
        provider varchar(32) NOT NULL,
        provider_payment_id varchar(128),
        status varchar(32) NOT NULL DEFAULT 'CREATED',
        amount_inr int NOT NULL,
        currency varchar(8) DEFAULT 'INR',
        provider_response jsonb,
        idempotency_key varchar(255),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(128) DEFAULT 'platform_settings',
        settings jsonb NOT NULL,
        changed_by uuid,
        changed_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_settings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS payments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS bookings;`);
  }
}
