import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SegmentType {
  ALL = 'all',
  FILTERED = 'filtered',
}

export class AdminBroadcastDto {
  @ApiProperty({ description: 'Push notification title', minLength: 10 })
  @IsString()
  @MinLength(10)
  title!: string;

  @ApiProperty({ description: 'Push notification body', minLength: 10 })
  @IsString()
  @MinLength(10)
  body!: string;

  @ApiPropertyOptional({ description: 'Optional image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Optional deep link URL' })
  @IsOptional()
  @IsString()
  deepLink?: string;

  @ApiProperty({ enum: SegmentType, description: 'Segment targeting type' })
  @IsEnum(SegmentType)
  segment!: SegmentType;

  @ApiPropertyOptional({
    description: 'Trek tag IDs — users who booked treks with these tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trekTagIds?: string[];

  @ApiPropertyOptional({
    description: 'States — users who booked treks in these states',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({
    description: 'Cities — users whose location matches (free-text)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({
    description: 'Only include users inactive (no booking) for N days',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  inactiveDays?: number;
}
