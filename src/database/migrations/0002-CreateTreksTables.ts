import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTreksTables0002 implements MigrationInterface {
  name = 'CreateTreksTables0002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create treks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS treks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organizer_id uuid,
        name varchar(255) NOT NULL,
        slug varchar(255),
        short_description varchar(512),
        full_description text,
        state varchar(80),
        location varchar(255),
        latitude double precision,
        longitude double precision,
        geom geometry(Point,4326),
        start_date timestamptz,
        end_date timestamptz,
        difficulty varchar(32),
        cost_inr int DEFAULT 0,
        max_participants int DEFAULT 1,
        is_published boolean DEFAULT false,
        avg_rating double precision DEFAULT 0,
        rating_count int DEFAULT 0,
        popularity_score bigint DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    // FK to users
    await queryRunner.query(`
      ALTER TABLE treks
      ADD CONSTRAINT fk_treks_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Create trek_tags
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        usage_count int DEFAULT 0
      );
    `);

    // Join table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_tags_link (
        trek_id uuid NOT NULL,
        tag_id uuid NOT NULL,
        PRIMARY KEY (trek_id, tag_id),
        CONSTRAINT fk_trek_tags_trek FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE,
        CONSTRAINT fk_trek_tags_tag FOREIGN KEY (tag_id) REFERENCES trek_tags(id) ON DELETE CASCADE
      );
    `);

    // Images
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_images (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trek_id uuid NOT NULL,
        key varchar(512) NOT NULL,
        url varchar(1024),
        is_primary boolean DEFAULT false,
        "order" int DEFAULT 0,
        alt_text varchar(255),
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_trek_images_trek FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE
      );
    `);

    // Reviews
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_reviews (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trek_id uuid NOT NULL,
        user_id uuid NOT NULL,
        rating int NOT NULL,
        comment text,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_trek_reviews_trek FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE,
        CONSTRAINT fk_trek_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Interactions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_interactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trek_id uuid NOT NULL,
        user_id uuid NOT NULL,
        type varchar(32) NOT NULL,
        weight int DEFAULT 1,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_trek_interactions_trek FOREIGN KEY (trek_id) REFERENCES treks(id) ON DELETE CASCADE,
        CONSTRAINT fk_trek_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Indexes: GiST on geom
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_treks_geom ON treks USING GIST (geom);`,
    );

    // Full-text search index on name, location, full_description
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_treks_search ON treks USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(location,'') || ' ' || coalesce(full_description,'')));
    `);

    // Basic indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_treks_state ON treks (state);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_treks_difficulty ON treks (difficulty);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_treks_is_published ON treks (is_published);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_trek_images_trek ON trek_images (trek_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_trek_reviews_trek ON trek_reviews (trek_id);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_trek_reviews_trek;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_trek_images_trek;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_treks_is_published;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_treks_difficulty;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_treks_state;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_treks_search;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_treks_geom;`);

    await queryRunner.query(`DROP TABLE IF EXISTS trek_interactions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trek_reviews;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trek_images;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trek_tags_link;`);
    await queryRunner.query(`DROP TABLE IF EXISTS trek_tags;`);
    await queryRunner.query(
      `ALTER TABLE treks DROP CONSTRAINT IF EXISTS fk_treks_organizer;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS treks;`);
  }
}
