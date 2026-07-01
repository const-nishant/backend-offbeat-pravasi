import { IsOptional, IsBoolean } from 'class-validator';

export class UpdatePackingItemDto {
  @IsOptional()
  @IsBoolean()
  hasItem?: boolean;

  @IsOptional()
  @IsBoolean()
  needsRental?: boolean;

  @IsOptional()
  @IsBoolean()
  checked?: boolean;
}
