import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostsStoriesTables0010 implements MigrationInterface {
  name = 'CreatePostsStoriesTables0010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        caption text NOT NULL,
        "imageUrls" text NOT NULL DEFAULT '',
        location varchar,
        "likesCount" int NOT NULL DEFAULT 0,
        "commentsCount" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz
      );
    `);

    await queryRunner.query(`
      ALTER TABLE posts
        ADD CONSTRAINT fk_posts_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_user_created
        ON posts ("userId", "createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "postId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        comment varchar(500) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE comments
        ADD CONSTRAINT fk_comments_post
        FOREIGN KEY ("postId") REFERENCES posts(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE comments
        ADD CONSTRAINT fk_comments_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_post
        ON comments ("postId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "postId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE post_likes
        ADD CONSTRAINT fk_post_likes_post
        FOREIGN KEY ("postId") REFERENCES posts(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE post_likes
        ADD CONSTRAINT fk_post_likes_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_post_user
        ON post_likes ("postId", "userId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "mediaUrl" varchar NOT NULL,
        "mediaType" varchar(20) NOT NULL,
        caption varchar(300),
        "expiresAt" timestamptz NOT NULL,
        "viewsCount" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE stories
        ADD CONSTRAINT fk_stories_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stories_user
        ON stories ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stories_expires_at
        ON stories ("expiresAt");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS story_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "storyId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "viewedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE story_views
        ADD CONSTRAINT fk_story_views_story
        FOREIGN KEY ("storyId") REFERENCES stories(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE story_views
        ADD CONSTRAINT fk_story_views_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_story_views_story_user
        ON story_views ("storyId", "userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS story_views;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stories;`);
    await queryRunner.query(`DROP TABLE IF EXISTS post_likes;`);
    await queryRunner.query(`DROP TABLE IF EXISTS comments;`);
    await queryRunner.query(`DROP TABLE IF EXISTS posts;`);
  }
}
