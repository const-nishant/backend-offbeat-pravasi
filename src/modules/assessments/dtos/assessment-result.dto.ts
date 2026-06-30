import { ApiProperty } from '@nestjs/swagger';

export class AssessmentResultDto {
  @ApiProperty()
  totalScore!: number;

  @ApiProperty()
  difficultyBracket!: string;

  @ApiProperty()
  recommendedDifficultyLabel!: string;

  @ApiProperty()
  completedAt!: Date;
}

export class PublicBracketDto {
  @ApiProperty({ nullable: true })
  difficultyBracket!: string | null;
}
