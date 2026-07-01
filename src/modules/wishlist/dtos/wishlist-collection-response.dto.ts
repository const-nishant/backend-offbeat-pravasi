import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WishlistItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  trekId!: string;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  addedAt!: Date;

  @ApiPropertyOptional()
  basePriceInr!: number | null;
}

export class WishlistCollectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  shareToken!: string | null;

  @ApiPropertyOptional({ type: [WishlistItemResponseDto] })
  items?: WishlistItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
