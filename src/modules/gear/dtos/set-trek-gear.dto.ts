import {
  IsArray,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequirementType } from '../enums/requirement-type.enum';

class TrekGearItemDto {
  @IsUUID()
  gearItemId: string;

  @IsEnum(RequirementType)
  requirementType: RequirementType;

  @IsOptional()
  @IsInt()
  rentalPriceInr?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetTrekGearDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => TrekGearItemDto)
  items: TrekGearItemDto[];
}
