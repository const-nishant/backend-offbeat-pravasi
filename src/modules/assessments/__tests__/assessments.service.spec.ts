import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentsService } from '../assessments.service';
import { FitnessAssessment } from '../entities/fitness-assessment.entity';
import { SubmitAssessmentDto } from '../dtos/submit-assessment.dto';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let assessmentRepo: jest.Mocked<Repository<FitnessAssessment>>;

  const mockAssessment = {
    id: 'assess-1',
    userId: 'user-1',
    totalScore: 75,
    difficultyBracket: 'DIFFICULT',
    answers: [{ questionId: 'q1', selectedOption: 'Daily' }],
    completedAt: new Date(),
    createdAt: new Date(),
  } as unknown as FitnessAssessment;

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

  describe('getQuestions', () => {
    it('should return all questions without scores', () => {
      const questions = service.getQuestions();

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(8);

      for (const q of questions) {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('options');
        expect(q.options[0]).toHaveProperty('label');
        expect(q.options[0]).not.toHaveProperty('score');
      }
    });
  });

  describe('submit', () => {
    it('should create assessment and return result with high score', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'exercise_frequency', selectedOption: 'Daily' },
          { questionId: 'longest_walk', selectedOption: '> 20 km' },
          { questionId: 'altitude_experience', selectedOption: 'Mountains (> 4000m)' },
          { questionId: 'camping_comfort', selectedOption: 'Very comfortable' },
          { questionId: 'medical_conditions', selectedOption: 'Excellent health' },
          { questionId: 'primary_goal', selectedOption: 'Summit / endurance' },
          { questionId: 'age_range', selectedOption: '18-30' },
          { questionId: 'prior_trek_count', selectedOption: '6+ treks' },
          { questionId: 'swimming_comfort', selectedOption: 'Very strong swimmer' },
          { questionId: 'sleeping_conditions', selectedOption: 'Prefer it' },
        ],
      };

      assessmentRepo.create.mockReturnValue(mockAssessment);
      assessmentRepo.save.mockResolvedValue(mockAssessment);

      const result = await service.submit('user-1', dto);

      expect(result.totalScore).toBeGreaterThanOrEqual(70);
      expect(result.difficultyBracket).toBe('DIFFICULT');
      expect(result.recommendedDifficultyLabel).toBeTruthy();
      expect(result.completedAt).toBeDefined();
      expect(assessmentRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        totalScore: expect.any(Number),
        difficultyBracket: expect.any(String),
        answers: dto.answers,
      });
    });

    it('should return EASY for all minimum answers', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'exercise_frequency', selectedOption: 'Never' },
          { questionId: 'longest_walk', selectedOption: '< 5 km' },
          { questionId: 'altitude_experience', selectedOption: 'Sea level (< 500m)' },
          { questionId: 'camping_comfort', selectedOption: 'Not comfortable' },
          { questionId: 'medical_conditions', selectedOption: 'Yes, significant concerns' },
          { questionId: 'primary_goal', selectedOption: 'Leisure / sightseeing' },
          { questionId: 'age_range', selectedOption: 'Under 18' },
          { questionId: 'prior_trek_count', selectedOption: 'None' },
          { questionId: 'swimming_comfort', selectedOption: 'Cannot swim' },
          { questionId: 'sleeping_conditions', selectedOption: 'Very uncomfortable' },
        ],
      };

      const expectedAssessment = { ...mockAssessment, totalScore: 0, difficultyBracket: 'EASY' } as unknown as FitnessAssessment;
      assessmentRepo.create.mockReturnValue(expectedAssessment);
      assessmentRepo.save.mockResolvedValue(expectedAssessment);

      const result = await service.submit('user-1', dto);

      expect(result.totalScore).toBeLessThanOrEqual(20);
      expect(result.difficultyBracket).toBe('EASY');
    });

    it('should return EXTREME for all maximum answers', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'exercise_frequency', selectedOption: 'Daily' },
          { questionId: 'longest_walk', selectedOption: '> 20 km' },
          { questionId: 'altitude_experience', selectedOption: 'Mountains (> 4000m)' },
          { questionId: 'camping_comfort', selectedOption: 'Very comfortable' },
          { questionId: 'medical_conditions', selectedOption: 'Excellent health' },
          { questionId: 'primary_goal', selectedOption: 'Summit / endurance' },
          { questionId: 'age_range', selectedOption: '18-30' },
          { questionId: 'prior_trek_count', selectedOption: '6+ treks' },
          { questionId: 'swimming_comfort', selectedOption: 'Very strong swimmer' },
          { questionId: 'sleeping_conditions', selectedOption: 'Prefer it' },
        ],
      };

      const highAssessment = { ...mockAssessment, totalScore: 100, difficultyBracket: 'EXTREME' } as unknown as FitnessAssessment;
      assessmentRepo.create.mockReturnValue(highAssessment);
      assessmentRepo.save.mockResolvedValue(highAssessment);

      const result = await service.submit('user-1', dto);

      expect(result.totalScore).toBeGreaterThanOrEqual(76);
      expect(result.difficultyBracket).toBe('EXTREME');
    });

    it('should handle partial answers gracefully', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [
          { questionId: 'exercise_frequency', selectedOption: 'Never' },
        ],
      };

      const lowAssessment = { ...mockAssessment, totalScore: 0, difficultyBracket: 'EASY' } as unknown as FitnessAssessment;
      assessmentRepo.create.mockReturnValue(lowAssessment);
      assessmentRepo.save.mockResolvedValue(lowAssessment);

      const result = await service.submit('user-1', dto);

      expect(result.difficultyBracket).toBe('EASY');
      expect(result.totalScore).toBe(0);
    });
  });

  describe('getLatestResult', () => {
    it('should return latest assessment when one exists', async () => {
      assessmentRepo.findOne.mockResolvedValue(mockAssessment);

      const result = await service.getLatestResult('user-1');

      expect(result).not.toBeNull();
      expect(result!.totalScore).toBe(75);
      expect(result!.difficultyBracket).toBe('DIFFICULT');
      expect(result!.recommendedDifficultyLabel).toBeTruthy();
      expect(assessmentRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { completedAt: 'DESC' },
      });
    });

    it('should return null when no assessment exists', async () => {
      assessmentRepo.findOne.mockResolvedValue(null);

      const result = await service.getLatestResult('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getPublicBracket', () => {
    it('should return bracket when assessment exists', async () => {
      assessmentRepo.findOne.mockResolvedValue(mockAssessment);

      const result = await service.getPublicBracket('user-1');

      expect(result.difficultyBracket).toBe('DIFFICULT');
    });

    it('should return null bracket when no assessment exists', async () => {
      assessmentRepo.findOne.mockResolvedValue(null);

      const result = await service.getPublicBracket('user-1');

      expect(result.difficultyBracket).toBeNull();
    });
  });
});
