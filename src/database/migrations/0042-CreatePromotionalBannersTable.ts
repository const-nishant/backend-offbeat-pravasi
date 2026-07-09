import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromotionalBannersTable0042 implements MigrationInterface {
  name = 'CreatePromotionalBannersTable0042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotional_banners (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        title varchar(200) NOT NULL,
        subtitle varchar(400),
        image_url text NOT NULL,
        cta_text varchar(100),
        cta_link text,
        placement varchar(32) NOT NULL DEFAULT 'homepage',
        start_date timestamptz NOT NULL,
        end_date timestamptz NOT NULL,
        priority int NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        impressions int NOT NULL DEFAULT 0,
        clicks int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_banners_placement_active
        ON promotional_banners (placement, is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_banners_dates
        ON promotional_banners (start_date, end_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS promotional_banners`);
  }
}
