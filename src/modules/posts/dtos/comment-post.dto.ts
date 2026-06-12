import { IsString, MaxLength } from 'class-validator';

export class CommentPostDto {
  @IsString()
  @MaxLength(500)
  comment!: string;
}
