export class WishlistItemResponseDto {
  id!: string;
  trekId!: string;
  notes!: string | null;
  priority!: number;
  sortOrder!: number;
  addedAt!: Date;
  basePriceInr!: number | null;
}

export class WishlistCollectionResponseDto {
  id!: string;
  name!: string;
  description!: string | null;
  sortOrder!: number;
  shareToken!: string | null;
  items?: WishlistItemResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
