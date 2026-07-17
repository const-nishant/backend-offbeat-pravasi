import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDataDeletionRequestsTable0049 implements MigrationInterface {
  name = 'CreateDataDeletionRequestsTable0049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_deletion_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'pending',
        reviewed_by uuid,
        rejection_reason text,
        processed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_del_req_user ON data_deletion_requests (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_del_req_status ON data_deletion_requests (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS data_deletion_requests`);
  }
}
