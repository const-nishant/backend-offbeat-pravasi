import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrekCategoriesTable0036 implements MigrationInterface {
  name = 'CreateTrekCategoriesTable0036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_categories (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name varchar(120) NOT NULL,
        slug varchar(120) NOT NULL,
        parent_id uuid,
        sort_order integer NOT NULL DEFAULT 0,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trek_categories_name
        ON trek_categories (name)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_trek_categories_slug
        ON trek_categories (slug)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS trek_categories`);
  }
}
