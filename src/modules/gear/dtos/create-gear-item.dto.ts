import { IsString, IsEnum } from 'class-validator';
import { GearCategory } from '../enums/gear-category.enum';

export class CreateGearItemDto {
  @IsString()
  name: string;

  @IsEnum(GearCategory)
  category: GearCategory;
}
