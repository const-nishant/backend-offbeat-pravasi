import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminNotificationPrefsTable0047
  implements MigrationInterface
{
  name = 'CreateAdminNotificationPrefsTable0047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_notification_preferences (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        admin_id uuid NOT NULL,
        event_type varchar(64) NOT NULL,
        channel varchar(16) NOT NULL,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notif_prefs_unique
        ON admin_notification_preferences (admin_id, event_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS admin_notification_preferences`,
    );
  }
}
