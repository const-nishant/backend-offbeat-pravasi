import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class TierDto {
  @IsInt()
  @Min(0)
  fromHoursBeforeStart: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  toHoursBeforeStart?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  refundPercentage: number;

  @IsInt()
  sortOrder: number;
}

export class CreatePolicyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => TierDto)
  tiers: TierDto[];
}
