import {
  IsOptional,
  IsString,
  IsInt,
  IsUUID,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

const toIntOrDefault = (defaultVal: number) =>
  Transform(({ value }) =>
    value !== undefined && value !== null ? Number(value) : defaultVal,
  );

export class AdminAnalyticsDauQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @toIntOrDefault(7)
  days?: number;
}

export class AdminAnalyticsTrekPopularityQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @toIntOrDefault(30)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @toIntOrDefault(50)
  limit?: number;
}

export class AdminAnalyticsFunnelQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  trekId?: string;
}

export class AdminAnalyticsRevenueQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @toIntOrDefault(90)
  days?: number;
}

export class AdminAnalyticsRetentionQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  @toIntOrDefault(12)
  months?: number;
}
