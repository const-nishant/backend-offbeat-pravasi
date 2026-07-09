import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCouponTables0034 implements MigrationInterface {
  name = 'CreateCouponTables0034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FLAT')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        code varchar(60) NOT NULL,
        discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
        discount_value integer NOT NULL,
        max_discount_cap integer,
        min_booking_amount integer NOT NULL DEFAULT 0,
        max_uses integer,
        used_count integer NOT NULL DEFAULT 0,
        applicable_trek_ids uuid[] DEFAULT '{}',
        valid_from timestamptz,
        valid_to timestamptz,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code
        ON coupons (code)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        coupon_id uuid NOT NULL,
        user_id uuid NOT NULL,
        booking_id uuid NOT NULL,
        discount_amount integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
        ON coupon_redemptions (coupon_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_booking
        ON coupon_redemptions (booking_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS coupon_redemptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS coupons`);
    await queryRunner.query(`DROP TYPE IF EXISTS discount_type`);
  }
}
