import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSuspendedToUsers0004 implements MigrationInterface {
  name = 'AddIsSuspendedToUsers0004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users (is_suspended);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_is_suspended;`);
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS is_suspended;`,
    );
  }
}
