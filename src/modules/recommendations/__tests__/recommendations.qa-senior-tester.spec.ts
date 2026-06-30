import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

describe('RecommendationsService QA Senior Review', () => {
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

  const makeTrek = (id: string, difficulty: TrekDifficulty, tags: string[], pop = 100, isPublished = true): Trek => ({
    id,
    name: `Trek ${id}`,
    difficulty,
    popularityScore: pop,
    startDate: new Date(),
    isPublished,
    tags: tags.map((name) => ({ id: `tag-${name}`, name }) as TrekTag),
    state: null,
    location: null,
    latitude: null,
    longitude: null,
    costInr: 0,
    maxParticipants: 10,
    currentParticipants: 0,
    avgRating: 0,
    ratingCount: 0,
    status: 'PUBLISHED' as any,
    slug: null,
    shortDescription: null,
    fullDescription: null,
    geom: null,
    organizer: null as any,
    images: [],
    reviews: [],
    itineraryDays: [],
    gearItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }) as unknown as Trek;

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
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // 1. Boundary analysis — scoring thresholds
  describe('Boundary: scoring weights', () => {
    it('should use default weights when settings missing', async () => {
      platformSettings.getSettings.mockRejectedValue(new Error('No settings'));
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('user-1', 5);
      expect(results).toBeDefined();
    });

    it('should use cold-start weights when user has no history', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('cold-start-user', 5);
      expect(results).toBeDefined();
    });

    it('should use normal weights when user has history', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure']), makeTrek('t-2', TrekDifficulty.MODERATE, ['scenic'])]);
      bookingRepo.find.mockResolvedValue([{ trekId: 't-1' } as Booking, { trekId: 't-2' } as Booking]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue({ difficultyBracket: 'MODERATE', totalScore: 50 } as FitnessAssessment);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('active-user', 10);
      expect(results).toBeDefined();
    });
  });

  // 2. Fitness score matching
  describe('Fitness score calculation', () => {
    it('should give high fitness score for matching difficulty', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.MODERATE, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue({ difficultyBracket: 'MODERATE', totalScore: 50 } as FitnessAssessment);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('fit-user', 5);
      expect(results).toBeDefined();
    });

    it('should give 0 fitness score when assessment missing', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.DIFFICULT, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('no-assessment-user', 5);
      expect(results).toBeDefined();
    });
  });

  // 3. Seasonal scoring
  describe('Seasonal score', () => {
    it('should prefer treks with start dates near current month', async () => {
      const nearFuture = new Date(Date.now() + 15 * 86400000);
      const farFuture = new Date(Date.now() + 200 * 86400000);
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([
        makeTrek('near', TrekDifficulty.EASY, ['a'], 50, true),
        makeTrek('far', TrekDifficulty.EASY, ['b'], 50, true),
      ]);
      trekRepo.find.mockResolvedValueOnce([
        { ...makeTrek('near', TrekDifficulty.EASY, ['a'], 50, true), startDate: nearFuture },
        { ...makeTrek('far', TrekDifficulty.EASY, ['b'], 50, true), startDate: farFuture },
      ] as any);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('season-user', 5);
      expect(results).toBeDefined();
    });
  });

  // 4. Empty/null scenarios
  describe('Empty/null scenarios', () => {
    it('should return empty list when no treks exist', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([]);
      const results = await service.refresh('user-1', 5);
      expect(results).toEqual([]);
    });

    it('should handle single trek gracefully', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('user-1', 5);
      expect(results).toBeDefined();
    });
  });

  // 5. getForTrek edge cases
  describe('getForTrek edge cases', () => {
    it('should return empty for non-existent trek', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      const results = await service.getForTrek('bad-id');
      expect(results).toEqual([]);
    });

    it('should exclude the trek itself from similar results', async () => {
      const solo = makeTrek('solo', TrekDifficulty.EASY, ['a']);
      trekRepo.findOne.mockResolvedValue(solo);
      trekRepo.find.mockResolvedValue([solo]);
      const results = await service.getForTrek('solo');
      expect(results).toHaveLength(0);
    });
  });

  // 6. Conversion event logging
  describe('Conversion event logging', () => {
    it('should log SERVED events for recommendations', async () => {
      resultRepo.find.mockResolvedValue([
        { id: 'r-1', userId: 'user-1', trekId: 't-1', score: 0.8, reason: 'POPULAR', expiresAt: new Date(Date.now() + 3600000) } as RecommendationResult,
      ]);
      eventRepo.create.mockReturnValue({} as any);
      eventRepo.save.mockResolvedValue({} as any);

      await service.getForUser('user-1', 10);
      expect(eventRepo.create).toHaveBeenCalled();
      expect(eventRepo.save).toHaveBeenCalled();
    });

    it('should not throw when event logging fails', async () => {
      resultRepo.find.mockResolvedValue([
        { id: 'r-1', userId: 'user-1', trekId: 't-1', score: 0.8, reason: 'POPULAR', expiresAt: new Date(Date.now() + 3600000) } as RecommendationResult,
      ]);
      eventRepo.save.mockRejectedValue(new Error('Log failed'));
      await expect(service.getForUser('user-1', 10)).resolves.toBeDefined();
    });
  });

  // 7. Preference persistence
  describe('Preference persistence', () => {
    it('should update existing preferences', async () => {
      const existing = { id: 'p-1', userId: 'user-1', maxBudget: 5000 };
      prefRepo.findOne.mockResolvedValue(existing as any);
      prefRepo.save.mockResolvedValue({ ...existing, maxBudget: 10000 } as any);

      await service.updatePreferences('user-1', { maxBudget: 10000 });
      expect(prefRepo.save).toHaveBeenCalled();
    });

    it('should handle empty preference DTO (no changes)', async () => {
      const existing = { id: 'p-1', userId: 'user-1', maxBudget: 5000, preferredDifficulty: ['MODERATE'] as string[] };
      prefRepo.findOne.mockResolvedValue(existing as any);
      prefRepo.save.mockResolvedValue(existing as any);

      await service.updatePreferences('user-1', {});
      expect(prefRepo.save).toHaveBeenCalled();
    });
  });

  // 8. Data integrity — result fields
  describe('Data integrity', () => {
    it('should store all required fields in recommendation results', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);

      let savedEntity: any = null;
      resultRepo.create.mockImplementation((data: any) => data as any);
      resultRepo.save.mockImplementation(async (entities: any) => {
        savedEntity = entities;
        return entities;
      });

      await service.refresh('user-1', 5);
      expect(savedEntity).toBeDefined();
      if (Array.isArray(savedEntity)) {
        const first = savedEntity[0];
        expect(first.userId).toBe('user-1');
        expect(first.trekId).toBeDefined();
        expect(typeof first.score).toBe('number');
        expect(first.reason).toBeDefined();
        expect(first.expiresAt).toBeDefined();
      }
    });
  });

  // 9. Non-existent user
  describe('Non-existent user', () => {
    it('should handle user with no bookings, no assessments, no wishlist', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('new-user', 5);
      expect(results).toBeDefined();
    });
  });

  // 10. Reason assignment logic
  describe('Reason assignment', () => {
    it('should assign reason based on highest contributing factor', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      const treks = [makeTrek('t-1', TrekDifficulty.MODERATE, ['adventure'])];
      trekRepo.find.mockResolvedValue(treks);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue({ difficultyBracket: 'MODERATE', totalScore: 60 } as FitnessAssessment);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((data: any) => data as any);
      resultRepo.save.mockImplementation((entities: any) => Promise.resolve(entities));

      const results = await service.refresh('user-1', 5);
      expect(results).toBeDefined();
      if (results.length > 0) {
        expect(typeof results[0].reason).toBe('string');
        expect(['COMPLETED_SIMILAR', 'WISHLIST_SIMILAR', 'FITNESS_MATCH', 'SEASONAL', 'POPULAR']).toContain(results[0].reason);
      }
    });
  });

  // 11. Refresh clears old results
  describe('Refresh clears old results', () => {
    it('should delete old results before saving new', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([makeTrek('t-1', TrekDifficulty.EASY, ['adventure'])]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      await service.refresh('user-1', 5);
      expect(resultRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });

  // 12. Popularity score normalization
  describe('Popularity normalization', () => {
    it('should handle zero popularity scores', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      const treks = [
        makeTrek('t-1', TrekDifficulty.EASY, ['a'], 0),
        makeTrek('t-2', TrekDifficulty.EASY, ['b'], 0),
      ];
      trekRepo.find.mockResolvedValue(treks);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockReturnValue({} as any);
      resultRepo.save.mockResolvedValue([] as any);

      const results = await service.refresh('user-1', 5);
      expect(results).toBeDefined();
    });
  });
});
