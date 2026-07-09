import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDataExportRequestsTable0050 implements MigrationInterface {
  name = 'CreateDataExportRequestsTable0050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_export_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'pending',
        reviewed_by uuid,
        rejection_reason text,
        file_url text,
        file_size bigint,
        processed_at timestamptz,
        download_expires_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_req_user ON data_export_requests (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_req_status ON data_export_requests (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS data_export_requests`);
  }
}
