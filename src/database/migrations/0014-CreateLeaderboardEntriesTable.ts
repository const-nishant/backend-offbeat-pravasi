import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaderboardEntriesTable0014 implements MigrationInterface {
  name = 'CreateLeaderboardEntriesTable0014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        score float NOT NULL DEFAULT 0,
        rank int NOT NULL DEFAULT 0,
        "boardType" varchar(20) NOT NULL DEFAULT 'global',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE leaderboard_entries
        ADD CONSTRAINT fk_leaderboard_entries_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user
        ON leaderboard_entries ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score
        ON leaderboard_entries (score, "updatedAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS leaderboard_entries;`);
  }
}
