import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediaTable0012 implements MigrationInterface {
  name = 'CreateMediaTable0012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS media (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid,
        bucket varchar(50) NOT NULL,
        key varchar(255) NOT NULL,
        "originalName" varchar(255) NOT NULL,
        "mimeType" varchar(50) NOT NULL,
        "sizeBytes" int NOT NULL,
        category varchar(20) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      ALTER TABLE media
        ADD CONSTRAINT fk_media_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_media_user
        ON media ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_media_category
        ON media (category);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS media;`);
  }
}
