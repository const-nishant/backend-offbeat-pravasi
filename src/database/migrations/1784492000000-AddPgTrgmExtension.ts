import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgTrgmExtension1784492000000 implements MigrationInterface {
  name = 'AddPgTrgmExtension1784492000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ponytail: admin trek-duplicate detection uses pg_trgm similarity();
    // the extension was never created, so the query 500s. CREATE EXTENSION is
    // idempotent. down() drops it (safe only if nothing else depends on it).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
  }
}
