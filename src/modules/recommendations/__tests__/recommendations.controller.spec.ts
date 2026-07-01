import { Test, type TestingModule } from '@nestjs/testing';
import { RecommendationsController } from '../recommendations.controller';
import { RecommendationsService } from '../recommendations.service';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let recommendationsService: jest.Mocked<RecommendationsService>;

  const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@test.com', isAdmin: false };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        {
          provide: RecommendationsService,
          useValue: {
            getForUser: jest.fn(),
            getForTrek: jest.fn(),
            refresh: jest.fn(),
            updatePreferences: jest.fn(),
            getPreferences: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    recommendationsService = module.get(RecommendationsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return recommendations for user', async () => {
      recommendationsService.getForUser.mockResolvedValue([
        { id: 'r-1', userId: 'user-1', trekId: 'trek-1', score: 0.9, reason: 'POPULAR', expiresAt: new Date(), createdAt: new Date() } as any,
      ]);

      const result = await controller.getRecommendations(mockUser, '10');
      expect(result).toHaveLength(1);
      expect(result[0].trekId).toBe('trek-1');
      expect(recommendationsService.getForUser).toHaveBeenCalledWith('user-1', 10);
    });

    it('should default limit to 10', async () => {
      recommendationsService.getForUser.mockResolvedValue([]);
      await controller.getRecommendations(mockUser, undefined);
      expect(recommendationsService.getForUser).toHaveBeenCalledWith('user-1', 10);
    });
  });

  describe('refreshRecommendations', () => {
    it('should force refresh recommendations', async () => {
      recommendationsService.refresh.mockResolvedValue([
        { id: 'r-1', userId: 'user-1', trekId: 'trek-2', score: 0.7, reason: 'SEASONAL', expiresAt: new Date(), createdAt: new Date() } as any,
      ]);

      const result = await controller.refreshRecommendations(mockUser);
      expect(result).toHaveLength(1);
      expect(result[0].trekId).toBe('trek-2');
    });
  });

  describe('getSimilarTreks', () => {
    it('should return similar treks', async () => {
      recommendationsService.getForTrek.mockResolvedValue([
        { trekId: 'trek-2', score: 0.85, reason: 'COMPLETED_SIMILAR' },
      ]);

      const result = await controller.getSimilarTreks('trek-1', '5');
      expect(result).toHaveLength(1);
      expect(result[0].trekId).toBe('trek-2');
    });
  });

  describe('setPreferences', () => {
    it('should update preferences', async () => {
      const dto = { maxBudget: 15000 };
      await controller.setPreferences(mockUser, dto);
      expect(recommendationsService.updatePreferences).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      recommendationsService.getPreferences.mockResolvedValue({ userId: 'user-1', maxBudget: 15000 } as any);
      const result = await controller.getPreferences(mockUser);
      expect(result).toBeDefined();
      expect(recommendationsService.getPreferences).toHaveBeenCalledWith('user-1');
    });
  });
});
