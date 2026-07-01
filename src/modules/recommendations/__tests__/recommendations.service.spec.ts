import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { RecommendationsService } from '../recommendations.service';
import { UserRecommendationPreference } from '../entities/user-recommendation-preference.entity';
import { RecommendationResult } from '../entities/recommendation-result.entity';
import { RecommendationEvent } from '../entities/recommendation-event.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { TrekTag } from '../../treks/entities/trek-tag.entity';
import { TrekDifficulty } from '../../treks/enums/trek-difficulty.enum';
import { FitnessAssessment } from '../../assessments/entities/fitness-assessment.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { WishlistCollection } from '../../wishlist/entities/wishlist-collection.entity';
import { WishlistItem } from '../../wishlist/entities/wishlist-item.entity';
import { PlatformSettingsService } from '../../admin/platform-settings.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let assessmentRepo: jest.Mocked<Repository<FitnessAssessment>>;
  let collectionRepo: jest.Mocked<Repository<WishlistCollection>>;
  let itemRepo: jest.Mocked<Repository<WishlistItem>>;
  let resultRepo: jest.Mocked<Repository<RecommendationResult>>;
  let eventRepo: jest.Mocked<Repository<RecommendationEvent>>;
  let platformSettings: jest.Mocked<PlatformSettingsService>;
  let prefRepo: jest.Mocked<Repository<UserRecommendationPreference>>;
  let tagRepo: jest.Mocked<Repository<TrekTag>>;

  const mockTrek = {
    id: 'trek-1',
    name: 'Test Trek',
    difficulty: TrekDifficulty.MODERATE,
    popularityScore: 100,
    startDate: new Date(),
    isPublished: true,
    tags: [{ id: 'tag-1', name: 'adventure' }] as TrekTag[],
  } as unknown as Trek;

  const mockTrek2 = {
    id: 'trek-2',
    name: 'Test Trek 2',
    difficulty: TrekDifficulty.DIFFICULT,
    popularityScore: 50,
    startDate: new Date(Date.now() + 30 * 86400000),
    isPublished: true,
    tags: [{ id: 'tag-2', name: 'scenic' }] as TrekTag[],
  } as unknown as Trek;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(Trek), useValue: { find: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(TrekTag), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(FitnessAssessment), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Booking), useValue: { find: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(WishlistCollection), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(WishlistItem), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(UserRecommendationPreference), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(RecommendationResult), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(RecommendationEvent), useValue: { create: jest.fn(), save: jest.fn() } },
        { provide: PlatformSettingsService, useValue: { getSettings: jest.fn() } },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    trekRepo = module.get(getRepositoryToken(Trek));
    bookingRepo = module.get(getRepositoryToken(Booking));
    assessmentRepo = module.get(getRepositoryToken(FitnessAssessment));
    collectionRepo = module.get(getRepositoryToken(WishlistCollection));
    itemRepo = module.get(getRepositoryToken(WishlistItem));
    resultRepo = module.get(getRepositoryToken(RecommendationResult));
    eventRepo = module.get(getRepositoryToken(RecommendationEvent));
    platformSettings = module.get(PlatformSettingsService);
    prefRepo = module.get(getRepositoryToken(UserRecommendationPreference));
    tagRepo = module.get(getRepositoryToken(TrekTag));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getForTrek', () => {
    it('should return similar treks based on tag Jaccard similarity', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      trekRepo.find.mockResolvedValue([mockTrek, mockTrek2]);

      const result = await service.getForTrek('trek-1', 5);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      const result = await service.getForTrek('bad-id');
      expect(result).toEqual([]);
    });
  });

  describe('getForUser', () => {
    it('should return cached recommendations if available', async () => {
      resultRepo.find.mockResolvedValue([
        { id: 'r-1', userId: 'user-1', trekId: 'trek-1', score: 0.8, reason: 'POPULAR', expiresAt: new Date(Date.now() + 3600000) } as RecommendationResult,
      ]);
      eventRepo.create.mockReturnValue({} as any);
      eventRepo.save.mockResolvedValue({} as any);

      const result = await service.getForUser('user-1', 10);
      expect(result).toHaveLength(1);
      expect(result[0].trekId).toBe('trek-1');
    });

    it('should trigger refresh if no cached results', async () => {
      resultRepo.find.mockResolvedValue([]);
      trekRepo.find.mockResolvedValue([mockTrek, mockTrek2]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      platformSettings.getSettings.mockResolvedValue({});
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const result = await service.getForUser('user-1', 10);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('buildAll', () => {
    it('should process users in batches', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([{ b_userId: 'user-1' }]).mockResolvedValueOnce([]),
      };
      bookingRepo.createQueryBuilder.mockReturnValue(qb as any);
      trekRepo.find.mockResolvedValue([mockTrek, mockTrek2]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      platformSettings.getSettings.mockResolvedValue({});
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      await service.buildAll();
      expect(bookingRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getCompletedTrekIds', () => {
    it('should return completed trek IDs', async () => {
      bookingRepo.find.mockResolvedValue([{ trekId: 'trek-1' } as Booking]);
      const result = await service.getCompletedTrekIds('user-1');
      expect(result.has('trek-1')).toBe(true);
      expect(result.size).toBe(1);
    });
  });

  describe('logConversion', () => {
    it('should log a conversion event', async () => {
      eventRepo.create.mockReturnValue({ userId: 'user-1', trekId: 'trek-1', eventType: 'CLICKED' } as any);
      eventRepo.save.mockResolvedValue({} as any);
      await service.logConversion('user-1', 'trek-1', 'CLICKED');
      expect(eventRepo.create).toHaveBeenCalled();
      expect(eventRepo.save).toHaveBeenCalled();
    });

    it('should not throw on save failure', async () => {
      eventRepo.save.mockRejectedValue(new Error('DB error'));
      await expect(service.logConversion('user-1', 'trek-1', 'CLICKED')).resolves.toBeUndefined();
    });
  });

  describe('updatePreferences', () => {
    it('should create new preferences if none exist', async () => {
      prefRepo.findOne.mockResolvedValue(null);
      prefRepo.create.mockReturnValue({ userId: 'user-1' } as any);
      prefRepo.save.mockResolvedValue({} as any);

      await service.updatePreferences('user-1', { maxBudget: 10000 });
      expect(prefRepo.create).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });
});
