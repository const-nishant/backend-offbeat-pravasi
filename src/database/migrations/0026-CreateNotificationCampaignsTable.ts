import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationCampaignsTable0026
  implements MigrationInterface
{
  name = 'CreateNotificationCampaignsTable0026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."notifications_type_enum"
        ADD VALUE IF NOT EXISTS 'BROADCAST'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(255) NOT NULL,
        body text NOT NULL,
        "imageUrl" varchar(512),
        "deepLink" varchar(512),
        "segmentConfig" jsonb NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        "totalUsers" int,
        "totalBatches" int,
        "completedBatches" int,
        error text,
        "createdById" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_status
        ON notification_campaigns (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_created_at
        ON notification_campaigns ("createdAt" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE notification_campaigns
        ADD CONSTRAINT fk_campaigns_created_by
        FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_campaigns`);
  }
}
