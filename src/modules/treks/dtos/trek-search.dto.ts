import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { TrekDifficulty } from '../enums/trek-difficulty.enum';

export class TrekSearchDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsEnum(TrekDifficulty)
  difficulty?: TrekDifficulty;

  @IsOptional()
  @IsInt()
  @Min(0)
  minCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCost?: number;

  @IsOptional()
  @IsString()
  sort?: 'relevance' | 'newest' | 'popular' | 'distance';

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
