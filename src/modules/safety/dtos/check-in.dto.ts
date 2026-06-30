import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty({ description: 'Latitude of check-in location' })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ description: 'Longitude of check-in location' })
  @IsNumber()
  longitude!: number;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Latitude of check-out location' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude of check-out location' })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class AcknowledgeSafetyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
