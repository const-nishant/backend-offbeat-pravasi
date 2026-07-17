import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCohortExportsTable0044 implements MigrationInterface {
  name = 'CreateCohortExportsTable0044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cohort_exports (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        filters jsonb NOT NULL,
        format varchar(8) NOT NULL DEFAULT 'csv',
        row_count int,
        file_url text,
        status varchar(32) NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cohort_exports`);
  }
}
