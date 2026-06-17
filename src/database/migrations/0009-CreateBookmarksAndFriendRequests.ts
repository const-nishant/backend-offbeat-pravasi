import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookmarksAndFriendRequests0009
  implements MigrationInterface
{
  name = 'CreateBookmarksAndFriendRequests0009';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS friend_request_status AS ENUM (
        'PENDING', 'ACCEPTED', 'DECLINED'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "senderId" uuid NOT NULL,
        "receiverId" uuid NOT NULL,
        status friend_request_status NOT NULL DEFAULT 'PENDING',
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE friend_requests
        ADD CONSTRAINT fk_friend_requests_sender
        FOREIGN KEY ("senderId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE friend_requests
        ADD CONSTRAINT fk_friend_requests_receiver
        FOREIGN KEY ("receiverId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_status
        ON friend_requests ("receiverId", status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_friend_requests_sender
        ON friend_requests ("senderId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bookmarks;`);
    await queryRunner.query(`DROP TABLE IF EXISTS friend_requests;`);
    await queryRunner.query(`DROP TYPE IF EXISTS friend_request_status;`);
  }
}
