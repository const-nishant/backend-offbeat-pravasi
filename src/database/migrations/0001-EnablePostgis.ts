import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostgis0001 implements MigrationInterface {
  name = 'EnablePostgis0001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create PostGIS extension if not present. Requires superuser or
    // appropriate privileges on the database.
    // `pgcrypto` provides `gen_random_uuid()` used by later migrations.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis_topology;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis_topology;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto;`);
  }
}
