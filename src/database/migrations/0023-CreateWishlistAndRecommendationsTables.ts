import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWishlistAndRecommendationsTables0023
  implements MigrationInterface
{
  name = 'CreateWishlistAndRecommendationsTables0023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wishlist collections
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wishlist_collections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        description varchar(512),
        "sortOrder" int NOT NULL DEFAULT 0,
        "shareToken" varchar(64) UNIQUE,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_collections_user_name
        ON wishlist_collections ("userId", name)
    `);

    // Wishlist items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "collectionId" uuid NOT NULL REFERENCES wishlist_collections(id) ON DELETE CASCADE,
        "trekId" uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
        notes varchar(512),
        priority int NOT NULL DEFAULT 0,
        "sortOrder" int NOT NULL DEFAULT 0,
        "addedAt" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_items_collection_trek
        ON wishlist_items ("collectionId", "trekId")
    `);

    // User recommendation preferences
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "preferredDifficulty" varchar[],
        "preferredStates" varchar(80)[],
        "maxBudget" int,
        "preferredDurationDays" int[],
        interests jsonb,
        "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rec_prefs_user
        ON user_recommendation_preferences ("userId")
    `);

    // Recommendation results (cached)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recommendation_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "trekId" uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
        score float NOT NULL,
        reason varchar(32) NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rec_results_user_score
        ON recommendation_results ("userId", score DESC)
    `);

    // Recommendation events (conversion tracking)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recommendation_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "recommendationResultId" uuid REFERENCES recommendation_results(id) ON DELETE SET NULL,
        "trekId" uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
        "eventType" varchar(32) NOT NULL,
        score float,
        reason varchar(32),
        "createdAt" timestamptz NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rec_events_user_type_time
        ON recommendation_events ("userId", "eventType", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rec_events_trek_type
        ON recommendation_events ("trekId", "eventType")
    `);

    // Seed recommendation weights into platform_settings
    await queryRunner.query(`
      INSERT INTO platform_settings (id, key, settings, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'platform_settings',
        '{
          "recommendationWeights": {
            "completedSimilarity": 0.30,
            "wishlistSimilarity": 0.20,
            "fitnessMatch": 0.20,
            "seasonalScore": 0.15,
            "popularityScore": 0.15,
            "coldStartCompletedSimilarity": 0.10,
            "coldStartWishlistSimilarity": 0.10,
            "coldStartFitnessMatch": 0.15,
            "coldStartSeasonalScore": 0.30,
            "coldStartPopularityScore": 0.35
          }
        }'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (key) DO UPDATE SET
        settings = platform_settings.settings || '{
          "recommendationWeights": {
            "completedSimilarity": 0.30,
            "wishlistSimilarity": 0.20,
            "fitnessMatch": 0.20,
            "seasonalScore": 0.15,
            "popularityScore": 0.15,
            "coldStartCompletedSimilarity": 0.10,
            "coldStartWishlistSimilarity": 0.10,
            "coldStartFitnessMatch": 0.15,
            "coldStartSeasonalScore": 0.30,
            "coldStartPopularityScore": 0.35
          }
        }'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS recommendation_events CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS recommendation_results CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS user_recommendation_preferences CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS wishlist_items CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS wishlist_collections CASCADE`,
    );
  }
}
