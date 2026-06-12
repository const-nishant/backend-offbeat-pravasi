import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeviceTokensAndNotifications0015
  implements MigrationInterface
{
  name = 'CreateDeviceTokensAndNotifications0015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM ('ANDROID', 'IOS', 'WEB')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."notifications_type_enum" AS ENUM (
        'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER',
        'FRIEND_REQUEST_RECEIVED', 'FRIEND_REQUEST_ACCEPTED',
        'NEW_FOLLOWER', 'NEW_LIKE', 'NEW_COMMENT',
        'TREK_UPDATE', 'ORGANIZER_APPROVED', 'ORGANIZER_REJECTED',
        'STORY_EXPIRING'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        token varchar(512) NOT NULL,
        platform "public"."device_tokens_platform_enum" NOT NULL,
        "appVersion" varchar(20),
        "lastSeenAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token_platform
        ON device_tokens (token, platform)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tokens_user
        ON device_tokens ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE device_tokens
        ADD CONSTRAINT fk_device_tokens_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        type "public"."notifications_type_enum" NOT NULL,
        title varchar(255) NOT NULL,
        body text NOT NULL,
        data jsonb,
        "readAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read
        ON notifications ("userId", "readAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created
        ON notifications ("userId", "createdAt" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE notifications
        ADD CONSTRAINT fk_notifications_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS device_tokens`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."notifications_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."device_tokens_platform_enum"`,
    );
  }
}
