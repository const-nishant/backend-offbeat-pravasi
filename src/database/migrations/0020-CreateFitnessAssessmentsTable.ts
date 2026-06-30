import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFitnessAssessmentsTable0020 implements MigrationInterface {
  name = 'CreateFitnessAssessmentsTable0020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fitness_assessments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "totalScore" int NOT NULL,
        "difficultyBracket" varchar(16) NOT NULL,
        answers jsonb NOT NULL DEFAULT '[]',
        "completedAt" timestamptz NOT NULL DEFAULT NOW(),
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fitness_assessments_user_date
        ON fitness_assessments ("userId", "completedAt" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_fitness_assessments_user_date;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS fitness_assessments CASCADE;`,
    );
  }
}
