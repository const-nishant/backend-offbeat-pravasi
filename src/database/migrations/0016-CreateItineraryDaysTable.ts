import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItineraryDaysTable0016 implements MigrationInterface {
  name = 'CreateItineraryDaysTable0016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS itinerary_days (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trekId" uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
        "dayNumber" int NOT NULL,
        title varchar(255) NOT NULL,
        description text,
        "distanceKm" double precision,
        "altitudeGainM" int,
        "altitudeLossM" int,
        "maxAltitudeM" int,
        "mealPlan" jsonb,
        "accommodationType" varchar(32),
        "activityType" varchar(32) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_itinerary_days_trek_day
      ON itinerary_days ("trekId", "dayNumber");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_itinerary_days_trek_id
      ON itinerary_days ("trekId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_itinerary_days_trek_id;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_itinerary_days_trek_day;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS itinerary_days CASCADE;`);
  }
}
