import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ description: 'Collection name', example: 'Monsoon Plans' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Treks I want to do this monsoon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;
}
