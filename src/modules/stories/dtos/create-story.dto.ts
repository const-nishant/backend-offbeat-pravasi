import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateStoryDto {
  @IsUrl()
  mediaUrl!: string;

  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
