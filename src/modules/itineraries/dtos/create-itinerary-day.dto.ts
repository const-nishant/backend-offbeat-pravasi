import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { ActivityType } from '../enums/activity-type.enum';

class MealPlanDto {
  @IsOptional()
  @IsString()
  breakfast?: string;

  @IsOptional()
  @IsString()
  lunch?: string;

  @IsOptional()
  @IsString()
  dinner?: string;
}

export class CreateItineraryDayDto {
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsInt()
  altitudeGainM?: number;

  @IsOptional()
  @IsInt()
  altitudeLossM?: number;

  @IsOptional()
  @IsInt()
  maxAltitudeM?: number;

  @IsOptional()
  @IsObject()
  mealPlan?: MealPlanDto;

  @IsOptional()
  @IsEnum(AccommodationType)
  accommodationType?: AccommodationType;

  @IsEnum(ActivityType)
  activityType!: ActivityType;
}
