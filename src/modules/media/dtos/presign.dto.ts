import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MediaCategory } from '../entities/media.entity';

export class PresignDto {
  @ApiProperty({ example: 'trek-image.jpg' })
  @IsString()
  filename!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ enum: MediaCategory })
  @IsEnum(MediaCategory)
  category!: MediaCategory;
}
