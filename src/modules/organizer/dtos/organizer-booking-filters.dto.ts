import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BookingStatusFilter {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export class OrganizerBookingFiltersDto {
  @IsOptional()
  @IsUUID()
  trekId?: string;

  @IsOptional()
  @IsEnum(BookingStatusFilter)
  status?: BookingStatusFilter;

  @IsOptional()
  @IsDateString()
  bookingDateFrom?: string;

  @IsOptional()
  @IsDateString()
  bookingDateTo?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
