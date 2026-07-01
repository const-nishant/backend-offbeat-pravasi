import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  Min,
  IsEnum,
  ArrayMaxSize,
} from 'class-validator';
import { TrekDifficulty } from '../../treks/enums/trek-difficulty.enum';

export class RecommendationPreferenceDto {
  @ApiPropertyOptional({
    description: 'Preferred difficulty levels',
    example: ['MODERATE', 'DIFFICULT'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TrekDifficulty, { each: true })
  preferredDifficulty?: TrekDifficulty[];

  @ApiPropertyOptional({
    description: 'Preferred states',
    example: ['Uttarakhand', 'Himachal Pradesh'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStates?: string[];

  @ApiPropertyOptional({ description: 'Max budget in INR', example: 15000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @ApiPropertyOptional({
    description: 'Preferred duration range [min, max] in days',
    example: [3, 7],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @IsInt({ each: true })
  @Min(0, { each: true })
  preferredDurationDays?: number[];

  @ApiPropertyOptional({
    description: 'Interest tag IDs',
    example: ['tag-id-1', 'tag-id-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}
