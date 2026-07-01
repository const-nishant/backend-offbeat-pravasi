import { ApiProperty } from '@nestjs/swagger';

export class RecommendationResultDto {
  @ApiProperty()
  trekId!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  reason!: string;
}

export class SimilarTrekDto {
  @ApiProperty()
  trekId!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  reason!: string;
}
