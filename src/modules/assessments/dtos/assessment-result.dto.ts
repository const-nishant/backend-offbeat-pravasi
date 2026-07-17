export class AssessmentResultDto {
  totalScore!: number;
  difficultyBracket!: string;
  recommendedDifficultyLabel!: string;
  completedAt!: Date;
}

export class PublicBracketDto {
  difficultyBracket!: string | null;
}
