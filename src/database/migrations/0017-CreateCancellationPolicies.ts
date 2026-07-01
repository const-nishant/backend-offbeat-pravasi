import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCancellationPolicies0017 implements MigrationInterface {
  name = 'CreateCancellationPolicies0017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cancellation_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(80) NOT NULL,
        description varchar(512),
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cancellation_tiers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "policyId" uuid NOT NULL REFERENCES cancellation_policies(id) ON DELETE CASCADE,
        "fromHoursBeforeStart" int NOT NULL,
        "toHoursBeforeStart" int,
        "refundPercentage" int NOT NULL,
        "sortOrder" int NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cancellation_tiers_policy_sort
      ON cancellation_tiers ("policyId", "sortOrder");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_policies (
        "trekId" uuid PRIMARY KEY REFERENCES treks(id) ON DELETE CASCADE,
        "policyId" uuid NOT NULL REFERENCES cancellation_policies(id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_policy_snapshots (
        "bookingId" uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
        "policyName" varchar(80) NOT NULL,
        tiers jsonb NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      INSERT INTO cancellation_policies (name, description, "isDefault")
      VALUES ('Standard', 'Standard cancellation policy: full refund 7+ days before, 50% refund 3-7 days before, no refund within 3 days.', true);
    `);

    const policyIdResult = await queryRunner.query(
      `SELECT id FROM cancellation_policies WHERE name = 'Standard'`,
    );
    const policyId = policyIdResult[0]?.id ?? (policyIdResult as any)[0]?.id;

    if (policyId) {
      await queryRunner.query(`
        INSERT INTO cancellation_tiers ("policyId", "fromHoursBeforeStart", "toHoursBeforeStart", "refundPercentage", "sortOrder")
        VALUES
          ('${policyId}', 168, NULL, 100, 1),
          ('${policyId}', 72, 167, 50, 2),
          ('${policyId}', 0, 71, 0, 3);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS booking_policy_snapshots CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS trek_policies CASCADE;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_cancellation_tiers_policy_sort;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS cancellation_tiers CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS cancellation_policies CASCADE;`,
    );
  }
}
