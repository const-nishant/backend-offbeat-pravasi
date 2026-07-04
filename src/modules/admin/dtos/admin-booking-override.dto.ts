import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
  IsISO8601,
} from 'class-validator';

export class AdminBookingOverrideDto {
  @IsOptional()
  @IsInt()
  priceDelta?: number;

  @IsOptional()
  @IsISO8601()
  newStartDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  IsISO8601,
} from 'class-validator';

export class AdminBookingOverrideDto {
  @IsOptional()
  @IsInt()
  priceDelta?: number;

  @IsOptional()
  @IsISO8601()
  newStartDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsString()
  @MinLength(10)
  reason!: string;
}
