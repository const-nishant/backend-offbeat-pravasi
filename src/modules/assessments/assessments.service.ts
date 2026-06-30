import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FitnessAssessment } from './entities/fitness-assessment.entity';
import { SubmitAssessmentDto } from './dtos/submit-assessment.dto';
import { QUIZ_QUESTIONS, calculateScore } from './constants/quiz-questions';
import { AssessmentResultDto } from './dtos/assessment-result.dto';

const RECOMMENDATION_LABELS: Record<string, string> = {
  EASY: 'Easy — suitable for beginners and casual hikers',
  MODERATE: 'Moderate — good for regular fitness enthusiasts',
  DIFFICULT: 'Difficult — requires good fitness and some experience',
  EXTREME: 'Extreme — demands excellent fitness and prior trekking experience',
};

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    @InjectRepository(FitnessAssessment)
    private readonly assessmentRepo: Repository<FitnessAssessment>,
  ) {}

  getQuestions() {
    return QUIZ_QUESTIONS.map(({ id, question, options }) => ({
      id,
      question,
      options: options.map((o) => ({ label: o.label })),
    }));
  }

  async submit(
    userId: string,
    dto: SubmitAssessmentDto,
  ): Promise<AssessmentResultDto> {
    const { totalScore, difficultyBracket } = calculateScore(dto.answers);

    const assessment = this.assessmentRepo.create({
      userId,
      totalScore,
      difficultyBracket,
      answers: dto.answers as unknown as Record<string, unknown>,
    });

    const saved = await this.assessmentRepo.save(assessment);

    this.logger.log(
      `User ${userId} completed assessment: score=${totalScore}, bracket=${difficultyBracket}`,
    );

    return {
      totalScore: saved.totalScore,
      difficultyBracket: saved.difficultyBracket,
      recommendedDifficultyLabel:
        RECOMMENDATION_LABELS[saved.difficultyBracket] ?? '',
      completedAt: saved.completedAt,
    };
  }

  async getLatestResult(userId: string): Promise<AssessmentResultDto | null> {
    const assessment = await this.assessmentRepo.findOne({
      where: { userId },
      order: { completedAt: 'DESC' },
    });

    if (!assessment) return null;

    return {
      totalScore: assessment.totalScore,
      difficultyBracket: assessment.difficultyBracket,
      recommendedDifficultyLabel:
        RECOMMENDATION_LABELS[assessment.difficultyBracket] ?? '',
      completedAt: assessment.completedAt,
    };
  }

  async getPublicBracket(
    userId: string,
  ): Promise<{ difficultyBracket: string | null }> {
    const result = await this.getLatestResult(userId);
    return { difficultyBracket: result?.difficultyBracket ?? null };
  }
}
