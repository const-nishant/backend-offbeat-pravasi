import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGearTables0018 implements MigrationInterface {
  name = 'CreateGearTables0018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS gear_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        category varchar(32) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "updatedAt" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_gear_items_category ON gear_items (category);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS trek_gear_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trekId" uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
        "gearItemId" uuid NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
        "requirementType" varchar(16) NOT NULL,
        "rentalPriceInr" int,
        notes varchar(512),
        "sortOrder" int NOT NULL DEFAULT 0,
        UNIQUE ("trekId", "gearItemId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_trek_gear_items_trek ON trek_gear_items ("trekId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_packing_list_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "trekGearItemId" uuid NOT NULL REFERENCES trek_gear_items(id) ON DELETE CASCADE,
        "hasItem" boolean NOT NULL DEFAULT false,
        "needsRental" boolean NOT NULL DEFAULT false,
        "checked" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE ("userId", "trekGearItemId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_packing_list_user ON user_packing_list_items ("userId");
    `);

    await queryRunner.query(`
      INSERT INTO gear_items (name, category) VALUES
        -- CLOTHING
        ('Trekking Pants', 'CLOTHING'),
        ('Thermal Base Layer Top', 'CLOTHING'),
        ('Thermal Base Layer Bottom', 'CLOTHING'),
        ('Fleece Jacket', 'CLOTHING'),
        ('Down Jacket', 'CLOTHING'),
        ('Rain/Windproof Jacket', 'CLOTHING'),
        ('Rain/Windproof Pants', 'CLOTHING'),
        ('Trekking Shirt (Quick Dry)', 'CLOTHING'),
        ('T-Shirts (Cotton)', 'CLOTHING'),
        ('Innerwear (Thermal)', 'CLOTHING'),
        ('Woolen Socks (2-3 pairs)', 'CLOTHING'),
        ('Gloves (Waterproof)', 'CLOTHING'),
        ('Woolen Cap/Beanie', 'CLOTHING'),
        ('Sun Hat/Cap', 'CLOTHING'),
        ('Buff/Neck Gaiter', 'CLOTHING'),
        -- FOOTWEAR
        ('Trekking Shoes (Waterproof)', 'FOOTWEAR'),
        ('Camp Sandals/Slippers', 'FOOTWEAR'),
        ('Gaiters', 'FOOTWEAR'),
        -- CAMPING
        ('Sleeping Bag (4 Season)', 'CAMPING'),
        ('Sleeping Bag Liner', 'CAMPING'),
        ('Sleeping Pad/Mat', 'CAMPING'),
        ('Trekking Pole', 'CAMPING'),
        ('Headlamp/Torch', 'CAMPING'),
        ('Spare Batteries', 'CAMPING'),
        ('Daypack (30-40L)', 'CAMPING'),
        ('Duffel Bag (60-80L)', 'CAMPING'),
        ('Dry Bags', 'CAMPING'),
        -- NAVIGATION
        ('Map of Trek Route', 'NAVIGATION'),
        ('Compass', 'NAVIGATION'),
        ('GPS Device/Phone', 'NAVIGATION'),
        ('Power Bank (20000mAh)', 'NAVIGATION'),
        -- TOILETRIES
        ('Sunscreen (SPF 50+)', 'TOILETRIES'),
        ('Lip Balm with SPF', 'TOILETRIES'),
        ('Toilet Paper & Wipes', 'TOILETRIES'),
        ('Hand Sanitizer', 'TOILETRIES'),
        ('Quick Dry Towel', 'TOILETRIES'),
        ('Basic First Aid Kit', 'TOILETRIES'),
        -- DOCUMENTS
        ('Government ID Proof', 'DOCUMENTS'),
        ('Trek Permit (if required)', 'DOCUMENTS'),
        ('Medical Certificate', 'DOCUMENTS'),
        ('Emergency Contact Card', 'DOCUMENTS'),
        ('Travel Insurance Document', 'DOCUMENTS'),
        -- OPTIONAL
        ('Camera', 'OPTIONAL'),
        ('Book/Kindle', 'OPTIONAL'),
        ('Snacks (Energy Bars)', 'OPTIONAL'),
        ('Electrolyte Powder', 'OPTIONAL'),
        ('Water Bottle/Hydration Bladder', 'OPTIONAL'),
        ('Walking Stick (Personal)', 'OPTIONAL'),
        ('Earplugs', 'OPTIONAL'),
        ('Sunglasses', 'OPTIONAL');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS user_packing_list_items CASCADE;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_trek_gear_items_trek;`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS trek_gear_items CASCADE;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_gear_items_category;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS gear_items CASCADE;`);
  }
}
