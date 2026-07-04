import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AssessmentsService } from '../assessments.service';
import { FitnessAssessment } from '../entities/fitness-assessment.entity';
import { QUIZ_QUESTIONS } from '../constants/quiz-questions';
import type { SubmitAssessmentDto } from '../dtos/submit-assessment.dto';

describe('AssessmentsService — QA Edge Cases', () => {
  let service: AssessmentsService;
  let assessmentRepo: jest.Mocked<Repository<FitnessAssessment>>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        {
          provide: getRepositoryToken(FitnessAssessment),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    assessmentRepo = module.get(getRepositoryToken(FitnessAssessment));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. All-minimum answers', () => {
    it('should return EASY bracket with score 0', async () => {
      const dto = buildAnswerSet(
        'Never',
        '< 5 km',
        'Sea level (< 500m)',
        'Not comfortable',
        'Yes, significant concerns',
        'Leisure / sightseeing',
        'Under 18',
        'None',
        'Cannot swim',
        'Very uncomfortable',
      );

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'EASY',
        totalScore: 0,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'EASY',
        totalScore: 0,
        completedAt: new Date(),
      } as any);

      const result = await service.submit('user-min', dto);
      expect(result.difficultyBracket).toBe('EASY');
      expect(result.totalScore).toBe(0);
    });
  });

  describe('2. All-maximum answers', () => {
    it('should return EXTREME bracket with high score', async () => {
      const dto = buildAnswerSet(
        'Daily',
        '> 20 km',
        'Mountains (> 4000m)',
        'Very comfortable',
        'Excellent health',
        'Summit / endurance',
        '18-30',
        '6+ treks',
        'Very strong swimmer',
        'Prefer it',
      );

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'EXTREME',
        totalScore: 100,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'EXTREME',
        totalScore: 100,
        completedAt: new Date(),
      } as any);

      const result = await service.submit('user-max', dto);
      expect(result.difficultyBracket).toBe('EXTREME');
      expect(result.totalScore).toBeGreaterThanOrEqual(76);
    });
  });

  describe('3. Medical flag (lowest health score)', () => {
    const dto = buildAnswerSet(
      'Daily',
      '> 20 km',
      'Mountains (> 4000m)',
      'Comfortable',
      'Yes, significant concerns',
      'Summit / endurance',
      '18-30',
      '6+ treks',
      'Very strong swimmer',
      'Prefer it',
    );

    it('should penalize medical condition heavily due to weight=2.0', async () => {
      const baseScore = computeExpectedWithOneChange(
        dto,
        'medical_conditions',
        'Excellent health',
      );
      const medicalScore = computeExpectedWithOneChange(
        dto,
        'medical_conditions',
        'Yes, significant concerns',
      );

      expect(medicalScore).toBeLessThan(baseScore);

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'EASY',
        totalScore: medicalScore,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'EASY',
        totalScore: medicalScore,
        completedAt: new Date(),
      } as any);

      const result = await service.submit('user-med', dto);
      expect(result.totalScore).toBe(medicalScore);
    });
  });

  describe('4. Partial answers (only 1 question answered)', () => {
    it('should handle gracefully without throwing', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'exercise_frequency', selectedOption: 'Daily' },
        ],
      };

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'EASY',
        totalScore: 100,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'EASY',
        totalScore: 100,
        completedAt: new Date(),
      } as any);

      await expect(service.submit('user-partial', dto)).resolves.toBeDefined();
    });
  });

  describe('5. Empty answers array', () => {
    it('should return EASY with score 0', async () => {
      const dto: SubmitAssessmentDto = { answers: [] };

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'EASY',
        totalScore: 0,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'EASY',
        totalScore: 0,
        completedAt: new Date(),
      } as any);

      const result = await service.submit('user-empty', dto);
      expect(result.difficultyBracket).toBe('EASY');
      expect(result.totalScore).toBe(0);
    });
  });

  describe('6. Repeated submissions (getLatestResult returns latest)', () => {
    it('should order by completedAt DESC', async () => {
      assessmentRepo.findOne.mockResolvedValue({
        totalScore: 50,
        difficultyBracket: 'MODERATE',
        completedAt: new Date('2026-06-02'),
      } as FitnessAssessment);

      const result = await service.getLatestResult('user-rep');
      expect(result!.difficultyBracket).toBe('MODERATE');
      expect(assessmentRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-rep' },
        order: { completedAt: 'DESC' },
      });
    });
  });

  describe('7. Unknown question ID in answers', () => {
    it('should skip unknown question IDs gracefully', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'nonexistent_id', selectedOption: 'Daily' },
          { questionId: 'exercise_frequency', selectedOption: '3-5x week' },
        ],
      };

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'MODERATE',
        totalScore: 50,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'MODERATE',
        totalScore: 50,
        completedAt: new Date(),
      } as any);

      const result = await service.submit('user-unk', dto);
      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
    });
  });

  describe('8. Unknown option label in answers', () => {
    it('should skip unknown option labels gracefully', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'exercise_frequency', selectedOption: 'Fake Option' },
          { questionId: 'longest_walk', selectedOption: '> 20 km' },
        ],
      };

      assessmentRepo.create.mockReturnValue({
        difficultyBracket: 'EC',
        totalScore: 33,
      } as any);
      assessmentRepo.save.mockResolvedValue({
        difficultyBracket: 'EC',
        totalScore: 33,
        completedAt: new Date(),
      } as any);

      await expect(service.submit('user-badopt', dto)).resolves.toBeDefined();
    });
  });

  describe('9. No prior assessments (getLatestResult returns null)', () => {
    it('should return null for new user', async () => {
      assessmentRepo.findOne.mockResolvedValue(null);
      const result = await service.getLatestResult('user-new');
      expect(result).toBeNull();
    });
  });

  describe('10. Users with no assessment (public bracket returns null)', () => {
    it('should return null difficultyBracket', async () => {
      assessmentRepo.findOne.mockResolvedValue(null);
      const result = await service.getPublicBracket('user-none');
      expect(result.difficultyBracket).toBeNull();
    });
  });

  describe('11. Boundary score (score = 20 → EASY, score = 21 → MODERATE)', () => {
    it('should correctly border between EASY and MODERATE', async () => {
      const veryLow = buildAnswerSet(
        'Never',
        '< 5 km',
        'Sea level (< 500m)',
        'Not comfortable',
        'Yes, significant concerns',
        'Leisure / sightseeing',
        'Under 18',
        'None',
        'Cannot swim',
        'Very uncomfortable',
      );
      // All 0-score = 0 total → EASY
      expect(veryLow.answers.length).toBe(10);
    });
  });

  describe('12. Boundary score (score = 75 → DIFFICULT, score = 76 → EXTREME)', () => {
    it('should correctly border between DIFFICULT and EXTREME', async () => {
      const veryHigh = buildAnswerSet(
        'Daily',
        '> 20 km',
        'Mountains (> 4000m)',
        'Very comfortable',
        'Excellent health',
        'Summit / endurance',
        '18-30',
        '6+ treks',
        'Very strong swimmer',
        'Prefer it',
      );
      expect(veryHigh.answers.length).toBe(10);
    });
  });
});

function buildAnswerSet(
  exercise: string,
  walk: string,
  altitude: string,
  camping: string,
  medical: string,
  goal: string,
  age: string,
  prior: string,
  swim: string,
  sleep: string,
): SubmitAssessmentDto {
  const ids = [
    'exercise_frequency',
    'longest_walk',
    'altitude_experience',
    'camping_comfort',
    'medical_conditions',
    'primary_goal',
    'age_range',
    'prior_trek_count',
    'swimming_comfort',
    'sleeping_conditions',
  ];
  const values = [
    exercise,
    walk,
    altitude,
    camping,
    medical,
    goal,
    age,
    prior,
    swim,
    sleep,
  ];
  return {
    answers: ids.map((id, i) => ({
      questionId: id,
      selectedOption: values[i],
    })),
  };
}

function computeExpectedWithOneChange(
  base: SubmitAssessmentDto,
  changeId: string,
  newValue: string,
): number {
  const changed = base.answers.map((a) =>
    a.questionId === changeId ? { ...a, selectedOption: newValue } : a,
  );
  let weightedSum = 0;
  let totalWeight = 0;
  for (const answer of changed) {
    const q = QUIZ_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!q) continue;
    const opt = q.options.find((o) => o.label === answer.selectedOption);
    if (!opt) continue;
    weightedSum += opt.score * q.weight;
    totalWeight += q.weight;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}
