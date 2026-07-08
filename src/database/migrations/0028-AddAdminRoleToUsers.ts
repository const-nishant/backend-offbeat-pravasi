import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminRoleToUsers0028 implements MigrationInterface {
  name = 'AddAdminRoleToUsers0028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT NULL
    `);

    await queryRunner.query(`
      UPDATE users
        SET role = 'superadmin'
        WHERE isAdmin = true AND role IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS role
    `);
  }
}
