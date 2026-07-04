import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSafetyTables0019 implements MigrationInterface {
  name = 'CreateSafetyTables0019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_safety_info (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trekId" uuid NOT NULL UNIQUE REFERENCES treks(id) ON DELETE CASCADE,
        "terrainRisks" text,
        "altitudeWarnings" text,
        "wildlifeAdvisories" text,
        "generalGuidelines" text,
        "baseCampContact" varchar(32),
        "localRescueContact" varchar(32),
        "nearestHospital" varchar(255),
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_safety_info_trek ON trek_safety_info ("trekId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_emergency_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        phone varchar(20) NOT NULL,
        relationship varchar(40) NOT NULL,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON user_emergency_contacts ("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_check_ins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "bookingId" uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "checkedInAt" timestamptz NOT NULL,
        "expectedCheckOutAt" timestamptz NOT NULL,
        "checkedOutAt" timestamptz,
        status varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "escalatedAt" timestamptz,
        "resolvedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_check_ins_user ON trek_check_ins ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_check_ins_status_date ON trek_check_ins (status, "expectedCheckOutAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trek_check_ins CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS user_emergency_contacts CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS trek_safety_info CASCADE;`);
  }
}
