import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBasePriceToWishlistItems0024 implements MigrationInterface {
  name = 'AddBasePriceToWishlistItems0024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS "basePriceInr" int;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE wishlist_items DROP COLUMN IF EXISTS "basePriceInr";`,
    );
  }
}
