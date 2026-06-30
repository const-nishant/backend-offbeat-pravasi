import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertSafetyInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terrainRisks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  altitudeWarnings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wildlifeAdvisories?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  generalGuidelines?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  baseCampContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  localRescueContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nearestHospital?: string;
}
