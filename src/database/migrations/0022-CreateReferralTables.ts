import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferralTables0022 implements MigrationInterface {
  name = 'CreateReferralTables0022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code varchar(20) NOT NULL,
        tier varchar(16) NOT NULL DEFAULT 'BASE',
        "totalReferrals" int NOT NULL DEFAULT 0,
        "successfulReferrals" int NOT NULL DEFAULT 0,
        "totalEarnedInr" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes ("userId");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes (code);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrerCodeId" uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
        "refereeUserId" uuid REFERENCES users(id) ON DELETE SET NULL,
        "refereeEmail" varchar(120) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'PENDING',
        "rewardType" varchar(16),
        "rewardValueInr" int,
        "rewardDeliveredAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_code_email ON referrals ("referrerCodeId", "refereeEmail");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_referrals_referee_user ON referrals ("refereeUserId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS referral_tier_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tier varchar(16) NOT NULL,
        "minSuccessfulReferrals" int NOT NULL,
        "rewardPerReferralInr" int NOT NULL,
        "refereeDiscountInr" int NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tier_config_tier ON referral_tier_config (tier);
    `);

    await queryRunner.query(`
      INSERT INTO referral_tier_config (tier, "minSuccessfulReferrals", "rewardPerReferralInr", "refereeDiscountInr")
      VALUES
        ('BASE', 0, 200, 300),
        ('SILVER', 3, 500, 500),
        ('GOLD', 10, 1000, 1000)
      ON CONFLICT (tier) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS referrals CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS referral_codes CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS referral_tier_config CASCADE;`);
  }
}
