import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrekStatusColumn0007 implements MigrationInterface {
  name = 'AddTrekStatusColumn0007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE treks ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'DRAFT';`,
    );
    await queryRunner.query(
      `UPDATE treks SET status = 'PUBLISHED' WHERE is_published = true AND (status IS NULL OR status = 'DRAFT');`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_treks_status ON treks (status);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_treks_status;`);
    await queryRunner.query(`ALTER TABLE treks DROP COLUMN IF EXISTS status;`);
  }
}
