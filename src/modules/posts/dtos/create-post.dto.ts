import { IsArray, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePostDto {
  @IsString()
  caption!: string;

  @IsArray()
  @IsUrl(undefined, { each: true })
  imageUrls!: string[];

  @IsOptional()
  @IsString()
  location?: string;
}
