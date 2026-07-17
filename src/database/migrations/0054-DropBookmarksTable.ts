import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropBookmarksTable0054 implements MigrationInterface {
  name = 'DropBookmarksTable0054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bookmarks;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "trekId" uuid NOT NULL,
        "createdAt" timestamptz DEFAULT now()
      );
    `);
    await queryRunner.query(`
      ALTER TABLE bookmarks
        ADD CONSTRAINT fk_bookmarks_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE bookmarks
        ADD CONSTRAINT fk_bookmarks_trek
        FOREIGN KEY ("trekId") REFERENCES treks(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_trek
        ON bookmarks ("userId", "trekId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_trek
        ON bookmarks ("trekId");
    `);
  }
}
