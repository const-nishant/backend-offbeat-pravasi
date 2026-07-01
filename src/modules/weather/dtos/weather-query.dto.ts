import { IsOptional, IsArray, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WeatherQueryDto {
  @ApiPropertyOptional({
    description: 'Filter forecast to specific dates (ISO format)',
    type: [String],
    example: ['2026-09-15', '2026-09-20'],
  })
  @IsOptional()
  @IsArray()
  @IsDateString({ strict: true }, { each: true })
  dates?: string[];
}
