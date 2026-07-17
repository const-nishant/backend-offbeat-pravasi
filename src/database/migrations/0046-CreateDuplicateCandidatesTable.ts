import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDuplicateCandidatesTable0046 implements MigrationInterface {
  name = 'CreateDuplicateCandidatesTable0046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS duplicate_candidates (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        entity_type varchar(16) NOT NULL,
        primary_id uuid NOT NULL,
        candidate_id uuid NOT NULL,
        similarity_score float NOT NULL DEFAULT 0,
        status varchar(16) NOT NULL DEFAULT 'open',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dup_candidates_type
        ON duplicate_candidates (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dup_candidates_status
        ON duplicate_candidates (status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS duplicate_candidates`);
  }
}
