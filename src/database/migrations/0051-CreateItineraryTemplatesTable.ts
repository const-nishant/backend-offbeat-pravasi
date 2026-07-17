import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItineraryTemplatesTable0051 implements MigrationInterface {
  name = 'CreateItineraryTemplatesTable0051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS itinerary_templates (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(200) NOT NULL,
        description text,
        region varchar(100),
        usage_count int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS itinerary_template_days (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        template_id uuid NOT NULL,
        day_number int NOT NULL,
        title varchar(200),
        description text,
        activities text,
        accommodation varchar(100),
        meals varchar(100),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_itinerary_days_template
        ON itinerary_template_days (template_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS itinerary_template_days`);
    await queryRunner.query(`DROP TABLE IF EXISTS itinerary_templates`);
  }
}
