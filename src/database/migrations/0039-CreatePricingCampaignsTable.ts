import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePricingCampaignsTable0039 implements MigrationInterface {
  name = 'CreatePricingCampaignsTable0039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pricing_campaigns (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(200) NOT NULL,
        trek_ids uuid[] NOT NULL,
        discount_type varchar(16) NOT NULL,
        discount_value int NOT NULL,
        max_cap int,
        min_booking_amount int,
        start_date timestamptz NOT NULL,
        end_date timestamptz NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_dates
        ON pricing_campaigns (start_date, end_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_campaigns_active
        ON pricing_campaigns (is_active)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pricing_campaigns`);
  }
}
