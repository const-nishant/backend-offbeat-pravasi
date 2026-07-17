import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformSettingsPresetsTable0035
  implements MigrationInterface
{
  name = 'CreatePlatformSettingsPresetsTable0035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_settings_presets (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(80) NOT NULL,
        description text,
        settings jsonb NOT NULL,
        is_built_in boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_presets_name
        ON platform_settings_presets (name)
    `);

    await queryRunner.query(`
      INSERT INTO platform_settings_presets (name, description, settings, is_built_in) VALUES
        ('maintenance', 'Blocks new bookings, shows maintenance banner', '{"maintenanceMode": true, "blockNewBookings": true, "showMaintenanceBanner": true}'::jsonb, true),
        ('holiday-surge', 'Increases platform fee, enables surge pricing', '{"platformFeePercent": 15, "surgePricing": true, "promoteSpecificTreks": true}'::jsonb, true),
        ('off-peak', 'Reduces platform fee, enables discount stack', '{"platformFeePercent": 3, "discountStacking": true}'::jsonb, true),
        ('emergency', 'Block all payments, enable read-only mode', '{"blockPayments": true, "readOnlyMode": true}'::jsonb, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform_settings_presets`);
  }
}
