import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReportsTable0013 implements MigrationInterface {
  name = 'CreateReportsTable0013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "reporterId" uuid NOT NULL,
        "targetType" varchar(20) NOT NULL,
        "targetId" uuid NOT NULL,
        reason varchar(20) NOT NULL,
        description text,
        status varchar(20) NOT NULL DEFAULT 'PENDING',
        "reviewedById" uuid,
        "adminNotes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "reviewedAt" timestamptz
      );
    `);

    await queryRunner.query(`
      ALTER TABLE reports
        ADD CONSTRAINT fk_reports_reporter
        FOREIGN KEY ("reporterId") REFERENCES users(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE reports
        ADD CONSTRAINT fk_reports_reviewer
        FOREIGN KEY ("reviewedById") REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status
        ON reports (status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_target
        ON reports ("targetType", "targetId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS reports;`);
  }
}
