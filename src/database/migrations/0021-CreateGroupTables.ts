import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupTables0021 implements MigrationInterface {
  name = 'CreateGroupTables0021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trekId" uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
        "leadUserId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        "maxSize" int NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'OPEN',
        "shareCode" varchar(12) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trek_groups_share_code ON trek_groups ("shareCode");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_groups_trek_status ON trek_groups ("trekId", status);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "groupId" uuid NOT NULL REFERENCES trek_groups(id) ON DELETE CASCADE,
        "userId" uuid REFERENCES users(id) ON DELETE SET NULL,
        email varchar(120) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'INVITED',
        "fullName" varchar(80),
        phone varchar(20),
        "emergencyContact" jsonb,
        "medicalConditions" text,
        "joinedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members ("groupId", "userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS group_members CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trek_groups CASCADE;`);
  }
}
