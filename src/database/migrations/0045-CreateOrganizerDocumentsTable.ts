import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizerDocumentsTable0045 implements MigrationInterface {
  name = 'CreateOrganizerDocumentsTable0045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizer_documents (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        organizer_id uuid NOT NULL,
        document_type varchar(32) NOT NULL,
        file_url text NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending',
        verified_by uuid,
        verified_at timestamptz,
        expires_at timestamptz,
        rejection_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_docs_organizer
        ON organizer_documents (organizer_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_docs_status
        ON organizer_documents (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_docs_expires
        ON organizer_documents (expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organizer_documents`);
  }
}
