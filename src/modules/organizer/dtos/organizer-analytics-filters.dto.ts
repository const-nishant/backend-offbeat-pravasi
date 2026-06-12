import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class OrganizerAnalyticsFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  trekId?: string;
}
