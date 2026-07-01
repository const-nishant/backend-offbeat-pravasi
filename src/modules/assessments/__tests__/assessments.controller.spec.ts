import { Test, type TestingModule } from '@nestjs/testing';
import { AssessmentsController } from '../assessments.controller';
import { AssessmentsService } from '../assessments.service';
import { SubmitAssessmentDto } from '../dtos/submit-assessment.dto';

describe('AssessmentsController', () => {
  let controller: AssessmentsController;
  let service: jest.Mocked<AssessmentsService>;

  const mockUser = { id: 'user-1', email: 'user@test.com', isAdmin: false };
  const mockQuestions = [
    {
      id: 'exercise_frequency',
      question: 'How often do you exercise?',
      options: [{ label: 'Never' }, { label: 'Daily' }],
    },
  ];
  const mockResult = {
    totalScore: 75,
    difficultyBracket: 'DIFFICULT',
    recommendedDifficultyLabel: 'Difficult — requires good fitness',
    completedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentsController],
      providers: [
        {
          provide: AssessmentsService,
          useValue: {
            getQuestions: jest.fn(),
            submit: jest.fn(),
            getLatestResult: jest.fn(),
            getPublicBracket: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AssessmentsController>(AssessmentsController);
    service = module.get(AssessmentsService);
  });

  describe('GET /assessments/questions', () => {
    it('should return quiz questions', async () => {
      service.getQuestions.mockReturnValue(mockQuestions);

      const result = await controller.getQuestions();

      expect(result).toEqual(mockQuestions);
      expect(service.getQuestions).toHaveBeenCalled();
    });
  });

  describe('POST /assessments/submit', () => {
    it('should submit answers and return result', async () => {
      const dto: SubmitAssessmentDto = {
        answers: [{ questionId: 'exercise_frequency', selectedOption: 'Daily' }],
      };
      service.submit.mockResolvedValue(mockResult);

      const result = await controller.submit(mockUser as any, dto);

      expect(result).toEqual(mockResult);
      expect(service.submit).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('GET /assessments/my-result', () => {
    it('should return latest result when exists', async () => {
      service.getLatestResult.mockResolvedValue(mockResult);

      const result = await controller.getMyResult(mockUser as any);

      expect(result).toEqual(mockResult);
      expect(service.getLatestResult).toHaveBeenCalledWith('user-1');
    });

    it('should return null when no result exists', async () => {
      service.getLatestResult.mockResolvedValue(null);

      const result = await controller.getMyResult(mockUser as any);

      expect(result).toBeNull();
    });
  });

  describe('GET /users/:userId/assessment-result', () => {
    it('should return public bracket', async () => {
      service.getPublicBracket.mockResolvedValue({ difficultyBracket: 'MODERATE' });

      const result = await controller.getUserBracket('user-2');

      expect(result).toEqual({ difficultyBracket: 'MODERATE' });
      expect(service.getPublicBracket).toHaveBeenCalledWith('user-2');
    });
  });
});
