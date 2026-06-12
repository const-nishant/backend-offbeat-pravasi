import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrganizerApplicationsTable0011
  implements MigrationInterface
{
  name = 'CreateOrganizerApplicationsTable0011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizer_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "organizationName" varchar(160) NOT NULL,
        "contactPerson" varchar(160),
        "contactPhone" varchar(20) NOT NULL,
        website varchar(160),
        bio text NOT NULL,
        "yearsOfExperience" int,
        "documentUrls" jsonb,
        "certificateUrls" jsonb,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        "adminNotes" text,
        "submittedAt" timestamptz NOT NULL DEFAULT now(),
        "reviewedAt" timestamptz
      );
    `);

    await queryRunner.query(`
      ALTER TABLE organizer_applications
        ADD CONSTRAINT fk_organizer_applications_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_organizer_applications_pending_user"
        ON organizer_applications ("userId")
        WHERE status = 'PENDING';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizer_applications_status
        ON organizer_applications (status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS organizer_applications;`);
  }
}
