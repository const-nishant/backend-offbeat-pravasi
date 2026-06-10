import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrentParticipantsToTreks0006 implements MigrationInterface {
  name = 'AddCurrentParticipantsToTreks0006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE treks ADD COLUMN IF NOT EXISTS current_participants int DEFAULT 0;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_treks_current_participants ON treks (current_participants);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_treks_current_participants;`,
    );
    await queryRunner.query(
      `ALTER TABLE treks DROP COLUMN IF EXISTS current_participants;`,
    );
  }
}
