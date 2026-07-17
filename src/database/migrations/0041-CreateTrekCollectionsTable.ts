import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrekCollectionsTable0041 implements MigrationInterface {
  name = 'CreateTrekCollectionsTable0041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_collections (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(200) NOT NULL,
        slug varchar(200) NOT NULL UNIQUE,
        description text,
        trek_ids uuid[] NOT NULL DEFAULT '{}',
        is_active boolean NOT NULL DEFAULT true,
        cover_image text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trek_collections`);
  }
}
