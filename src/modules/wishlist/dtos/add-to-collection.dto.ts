import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddToCollectionDto {
  @ApiProperty({ description: 'Trek ID to add' })
  @IsUUID()
  trekId!: string;

  @ApiPropertyOptional({ description: 'Personal note about this trek' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Priority: 0=normal, 1=high, 2=top',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  priority?: number;
}
