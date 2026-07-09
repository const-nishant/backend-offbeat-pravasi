import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayoutsTable0040 implements MigrationInterface {
  name = 'CreatePayoutsTable0040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE payout_status AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'SETTLED', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        organizer_id uuid NOT NULL,
        amount int NOT NULL,
        platform_fee int NOT NULL DEFAULT 0,
        net_amount int NOT NULL,
        status payout_status NOT NULL DEFAULT 'PENDING',
        period_start timestamptz NOT NULL,
        period_end timestamptz NOT NULL,
        settled_at timestamptz,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payouts_organizer
        ON payouts (organizer_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payouts_status
        ON payouts (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payouts_period
        ON payouts (period_start, period_end)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payouts`);
    await queryRunner.query(`DROP TYPE IF EXISTS payout_status`);
  }
}
