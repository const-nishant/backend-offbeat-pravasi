import { IsNumber, IsOptional, IsInt, Min } from 'class-validator';

export class NearbyDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  radiusMeters?: number = 5000;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
