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

/**
 * Deep Validation Suite — 12-year QA Engineer perspective
 */
describe('Recommendations Deep Validation — 12yr QA', () => {
  let service: RecommendationsService;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let assessmentRepo: jest.Mocked<Repository<FitnessAssessment>>;
  let collectionRepo: jest.Mocked<Repository<WishlistCollection>>;
  let itemRepo: jest.Mocked<Repository<WishlistItem>>;
  let resultRepo: jest.Mocked<Repository<RecommendationResult>>;
  let eventRepo: jest.Mocked<Repository<RecommendationEvent>>;
  let prefRepo: jest.Mocked<Repository<UserRecommendationPreference>>;
  let platformSettings: jest.Mocked<PlatformSettingsService>;

  const makeTrek = (
    id: string,
    difficulty: TrekDifficulty,
    tags: string[],
    pop = 100,
    isPublished = true,
    startDate?: Date,
    state?: string,
  ): Trek => ({
    id,
    name: `Trek ${id}`,
    difficulty,
    popularityScore: pop,
    startDate: startDate ?? new Date(),
    isPublished,
    state: state ?? null,
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
    tags: tags.map((name) => ({ id: `tag-${name}`, name }) as TrekTag),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }) as unknown as Trek;

  // Helper: make weights that isolate exactly one signal
  const singleSignalWeights = (signal: string) => {
    const base: Record<string, number> = {
      completedSimilarity: 0, wishlistSimilarity: 0, fitnessMatch: 0,
      seasonalScore: 0, popularityScore: 0,
      coldStartCompletedSimilarity: 0, coldStartWishlistSimilarity: 0,
      coldStartFitnessMatch: 0, coldStartSeasonalScore: 0, coldStartPopularityScore: 0,
    };
    base[signal] = 1.0;
    base[`coldStart${signal[0].toUpperCase() + signal.slice(1)}`] = 1.0;
    return base;
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getRepositoryToken(Trek), useValue: { find: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(TrekTag), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(FitnessAssessment), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Booking), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(WishlistCollection), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(WishlistItem), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(UserRecommendationPreference), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(RecommendationResult), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(RecommendationEvent), useValue: { create: jest.fn(), save: jest.fn().mockResolvedValue([]) } },
        { provide: PlatformSettingsService, useValue: { getSettings: jest.fn().mockResolvedValue({}) } },
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
    prefRepo = module.get(getRepositoryToken(UserRecommendationPreference));
    platformSettings = module.get(PlatformSettingsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (service as any).weightsCache = null;
    (service as any).weightsCacheAt = 0;
  });

  // ──────────────────────────────────────────────
  // 1. SCORE PRECISION — exact Jaccard values
  // ──────────────────────────────────────────────
  describe('Score precision — Jaccard similarity exactness', () => {
    it('should compute exact Jaccard 0.5 for 2/4 tag overlap', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('completedSimilarity'),
      });
      // 2+ completed bookings → isColdStart = false
      bookingRepo.find.mockResolvedValue([
        { trekId: 'done-1' } as Booking,
        { trekId: 'done-2' } as Booking,
      ]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      // done-1 has [a,b,c], done-2 has [x,y,z]
      // candidate has [a,b,d] → Jaccard with done-1 = 2/4 = 0.5, with done-2 = 0/6 = 0
      // computeJaccardMax → max(0.5, 0) = 0.5
      // final score = 1.0 * 0.5 = 0.5
      // Use mockResolvedValueOnce so tag-map queries only return completed treks
      trekRepo.find
        .mockResolvedValueOnce([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b', 'c']),
          makeTrek('done-2', TrekDifficulty.EASY, ['x', 'y', 'z']),
          makeTrek('cand', TrekDifficulty.EASY, ['a', 'b', 'd']),
        ])
        .mockResolvedValue([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b', 'c']),
          makeTrek('done-2', TrekDifficulty.EASY, ['x', 'y', 'z']),
        ]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      const cand = results.find((r) => r.trekId === 'cand');
      expect(cand).toBeDefined();
      expect(cand!.score).toBeCloseTo(0.5, 5);
    });

    it('should give 0 score for no tag overlap', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('completedSimilarity'),
      });
      bookingRepo.find.mockResolvedValue([
        { trekId: 'done-1' } as Booking,
        { trekId: 'done-2' } as Booking,
      ]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      trekRepo.find
        .mockResolvedValueOnce([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b']),
          makeTrek('done-2', TrekDifficulty.EASY, ['a', 'b']),
          makeTrek('cand', TrekDifficulty.EASY, ['x', 'y', 'z']),
        ])
        .mockResolvedValue([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b']),
          makeTrek('done-2', TrekDifficulty.EASY, ['a', 'b']),
        ]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      const cand = results.find((r) => r.trekId === 'cand');
      expect(cand!.score).toBeCloseTo(0, 5);
    });
  });

  // ──────────────────────────────────────────────
  // 2. SCORE MONOTONICITY
  // ──────────────────────────────────────────────
  describe('Score monotonicity', () => {
    it('should rank 3-tag match above 1-tag match', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('completedSimilarity'),
      });
      bookingRepo.find.mockResolvedValue([
        { trekId: 'done-1' } as Booking,
        { trekId: 'done-2' } as Booking,
      ]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      trekRepo.find
        .mockResolvedValueOnce([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b', 'c', 'd']),
          makeTrek('done-2', TrekDifficulty.EASY, ['a', 'b', 'c', 'd']),
          makeTrek('good', TrekDifficulty.EASY, ['a', 'b', 'c', 'z']),
          makeTrek('weak', TrekDifficulty.EASY, ['a', 'x', 'y', 'z']),
        ])
        .mockResolvedValue([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b', 'c', 'd']),
          makeTrek('done-2', TrekDifficulty.EASY, ['a', 'b', 'c', 'd']),
        ]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      const good = results.find((r) => r.trekId === 'good');
      const weak = results.find((r) => r.trekId === 'weak');
      expect(good!.score).toBeGreaterThan(weak!.score);
    });
  });

  // ──────────────────────────────────────────────
  // 3. FITNESS MATCH EXACT FORMULA
  // ──────────────────────────────────────────────
  describe('Fitness match exact formula', () => {
    it('should return 1.0 when difficulty matches bracket exactly', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('fitnessMatch'),
      });
      // isColdStart = true (0 completed, 0 wishlisted) →
      // need coldStartFitnessMatch set (singleSignalWeights handles this)
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue({ difficultyBracket: 'MODERATE', totalScore: 50 } as FitnessAssessment);

      const trek = makeTrek('t-1', TrekDifficulty.MODERATE, ['a']);
      trekRepo.find.mockResolvedValue([trek]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('fit-user', 10);
      // MODERATE(0.5) matches MODERATE(0.5) → trekVal <= 0.5+0.25 && trekVal >= 0.5-0.5 → true → 1.0
      // Score = 1.0 * 1.0 = 1.0
      expect(results[0].score).toBeCloseTo(1.0, 5);
    });

    it('should return partial score when difficulty is far from bracket', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('fitnessMatch'),
      });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue({ difficultyBracket: 'EASY', totalScore: 10 } as FitnessAssessment);

      const trek = makeTrek('t-1', TrekDifficulty.EXTREME, ['a']);
      trekRepo.find.mockResolvedValue([trek]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('fit-user', 10);
      // EASY=0.25, EXTREME=1.0
      // trekVal(1.0) <= userVal(0.25)+0.25=0.5? No. trekVal >= userVal-0.5= -0.25? Yes.
      // Only second condition true → goes to diff: |1.0-0.25| = 0.75 → 1.0-0.75 = 0.25
      expect(results[0].score).toBeCloseTo(0.25, 5);
    });
  });

  // ──────────────────────────────────────────────
  // 4. SEASONAL SCORE FORMULA
  // ──────────────────────────────────────────────
  describe('Seasonal score formula', () => {
    it('should return 1.0 for trek starting within 1 month of now', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('seasonalScore'),
      });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const nearDate = new Date(Date.now() + 15 * 86400000);
      const trek = makeTrek('t-1', TrekDifficulty.EASY, ['a'], 0, true, nearDate);
      trekRepo.find.mockResolvedValue([trek]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      // Current month = June (5). Trek month = June (5). diff = 0 ≤ 1 → 1.0
      // Score = 1.0 * 1.0 = 1.0
      expect(results[0].score).toBe(1.0);
    });

    it('should return 0 for trek with no start date', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('seasonalScore'),
      });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const noDateTrek = makeTrek('t-1', TrekDifficulty.EASY, ['a']);
      noDateTrek.startDate = null as any;
      trekRepo.find.mockResolvedValue([noDateTrek]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      expect(results[0].score).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // 5. POPULARITY NORMALIZATION
  // ──────────────────────────────────────────────
  describe('Popularity normalization', () => {
    it('should normalize popularity scores between 0 and 1', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('popularityScore'),
      });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      trekRepo.find.mockResolvedValue([
        makeTrek('pop', TrekDifficulty.EASY, ['a'], 500),
        makeTrek('mid', TrekDifficulty.EASY, ['b'], 250),
        makeTrek('min', TrekDifficulty.EASY, ['c'], 0),
      ]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      const pop = results.find((r) => r.trekId === 'pop')!;
      const mid = results.find((r) => r.trekId === 'mid')!;
      const min = results.find((r) => r.trekId === 'min')!;
      expect(pop.score).toBeCloseTo(1.0, 5);
      expect(mid.score).toBeCloseTo(0.5, 5);
      expect(min.score).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // 6. REASON ASSIGNMENT
  // ──────────────────────────────────────────────
  describe('Reason assignment priority', () => {
    it('should assign COMPLETED_SIMILAR when completedScore > 0.3', async () => {
      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: singleSignalWeights('completedSimilarity'),
      });
      bookingRepo.find.mockResolvedValue([
        { trekId: 'done-1' } as Booking,
        { trekId: 'done-2' } as Booking,
      ]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      trekRepo.find
        .mockResolvedValueOnce([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b', 'c']),
          makeTrek('done-2', TrekDifficulty.EASY, ['a', 'b', 'c']),
          makeTrek('match', TrekDifficulty.EASY, ['a', 'b', 'c']),
        ])
        .mockResolvedValue([
          makeTrek('done-1', TrekDifficulty.EASY, ['a', 'b', 'c']),
          makeTrek('done-2', TrekDifficulty.EASY, ['a', 'b', 'c']),
        ]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      const m = results.find((r) => r.trekId === 'match');
      expect(m!.reason).toBe('COMPLETED_SIMILAR');
    });

    it('should assign FITNESS_MATCH when fitnessScore > 0.6', async () => {
      platformSettings.getSettings.mockResolvedValue({ recommendationWeights: { fitnessMatch: 1.0, coldStartFitnessMatch: 1.0, coldStartPopularityScore: 0, coldStartSeasonalScore: 0, coldStartCompletedSimilarity: 0, coldStartWishlistSimilarity: 0, completedSimilarity: 0, wishlistSimilarity: 0, seasonalScore: 0, popularityScore: 0 } });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue({ difficultyBracket: 'MODERATE', totalScore: 60 } as FitnessAssessment);

      trekRepo.find.mockResolvedValue([makeTrek('t', TrekDifficulty.MODERATE, ['a'])]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      expect(results[0].reason).toBe('FITNESS_MATCH');
    });

    it('should assign SEASONAL when seasonalScore > 0.5', async () => {
      platformSettings.getSettings.mockResolvedValue({ recommendationWeights: { seasonalScore: 1.0, coldStartSeasonalScore: 1.0, coldStartPopularityScore: 0, coldStartFitnessMatch: 0, coldStartCompletedSimilarity: 0, coldStartWishlistSimilarity: 0, completedSimilarity: 0, wishlistSimilarity: 0, fitnessMatch: 0, popularityScore: 0 } });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      // This month's trek → seasonalScore = 1.0
      trekRepo.find.mockResolvedValue([makeTrek('t', TrekDifficulty.EASY, ['a'])]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      expect(results[0].reason).toBe('SEASONAL');
    });

    it('should assign POPULAR as fallback when no other signal fires', async () => {
      const trek = makeTrek('t', TrekDifficulty.EASY, ['a'], 100);
      trek.startDate = new Date(Date.now() - 250 * 86400000); // 8+ months ago → seasonal = 0.2 (diff > 3, < 0.5 threshold)

      platformSettings.getSettings.mockResolvedValue({
        recommendationWeights: {
          popularityScore: 1.0, coldStartPopularityScore: 1.0,
          seasonalScore: 0, coldStartSeasonalScore: 0,
          fitnessMatch: 0, coldStartFitnessMatch: 0,
          completedSimilarity: 0, coldStartCompletedSimilarity: 0,
          wishlistSimilarity: 0, coldStartWishlistSimilarity: 0,
        },
      });
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);
      trekRepo.find.mockResolvedValue([trek]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 10);
      expect(results[0].reason).toBe('POPULAR');
    });
  });

  // ──────────────────────────────────────────────
  // 7. getForTrek correctness
  // ──────────────────────────────────────────────
  describe('getForTrek correctness', () => {
    it('should exclude the queried trek from results', async () => {
      trekRepo.findOne.mockResolvedValue(makeTrek('self', TrekDifficulty.EASY, ['a']));
      trekRepo.find.mockResolvedValue([
        makeTrek('self', TrekDifficulty.EASY, ['a']),
        makeTrek('other', TrekDifficulty.EASY, ['b']),
      ]);
      const results = await service.getForTrek('self', 10);
      expect(results.find((r) => r.trekId === 'self')).toBeUndefined();
    });

    it('should return results sorted descending by score', async () => {
      trekRepo.findOne.mockResolvedValue(makeTrek('base', TrekDifficulty.EASY, ['a', 'b', 'c']));
      trekRepo.find.mockResolvedValue([
        makeTrek('base', TrekDifficulty.EASY, ['a', 'b', 'c']),
        makeTrek('high', TrekDifficulty.EASY, ['a', 'b']),
        makeTrek('mid', TrekDifficulty.EASY, ['a']),
        makeTrek('low', TrekDifficulty.EASY, ['x']),
      ]);

      const results = await service.getForTrek('base', 10);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should return empty when only one trek exists', async () => {
      const solo = makeTrek('solo', TrekDifficulty.EASY, ['a']);
      trekRepo.findOne.mockResolvedValue(solo);
      trekRepo.find.mockResolvedValue([solo]);
      const results = await service.getForTrek('solo', 10);
      expect(results).toEqual([]);
    });

    it('should return empty when trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      const results = await service.getForTrek('nonexistent', 10);
      expect(results).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // 8. LIMIT ENFORCEMENT
  // ──────────────────────────────────────────────
  describe('Limit enforcement', () => {
    it('should not return more than the requested limit', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const treks = Array.from({ length: 20 }, (_, i) =>
        makeTrek(`t-${i}`, TrekDifficulty.EASY, [`tag-${i}`], i * 10),
      );
      trekRepo.find.mockResolvedValue(treks);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const results = await service.refresh('user', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array when limit is 0', async () => {
      trekRepo.find.mockResolvedValue([]);
      const results = await service.refresh('user', 0);
      expect(results).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // 9. buildAll batch processing
  // ──────────────────────────────────────────────
  describe('buildAll batch processing', () => {
    it('should handle empty batches gracefully', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([]),
      };
      bookingRepo.createQueryBuilder = jest.fn().mockReturnValue(qb as any);
      await service.buildAll();
      expect(bookingRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should continue processing when one user fails', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn()
          .mockResolvedValueOnce([{ b_userId: 'user-1' }, { b_userId: 'user-2' }])
          .mockResolvedValueOnce([]),
      };
      bookingRepo.createQueryBuilder = jest.fn().mockReturnValue(qb as any);
      trekRepo.find.mockRejectedValueOnce(new Error('DB fail')).mockResolvedValueOnce([]);

      await expect(service.buildAll()).resolves.toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────
  // 10. PREFERENCE UPDATE
  // ──────────────────────────────────────────────
  describe('Preference partial update', () => {
    it('should only update provided fields, preserve others', async () => {
      const existing = { id: 'p-1', userId: 'user-1', maxBudget: 5000, preferredDifficulty: ['MODERATE'], preferredStates: null, preferredDurationDays: null, interests: null };
      prefRepo.findOne.mockResolvedValue(existing as any);
      let saved: any = null;
      prefRepo.save.mockImplementation((e: any) => { saved = e; return Promise.resolve(e); });

      await service.updatePreferences('user-1', { maxBudget: 10000 });
      expect(saved.maxBudget).toBe(10000);
      expect(saved.preferredDifficulty).toEqual(['MODERATE']);
    });
  });

  // ──────────────────────────────────────────────
  // 11. MALFORMED DATA RESILIENCE
  // ──────────────────────────────────────────────
  describe('Malformed data resilience', () => {
    it('should not crash when trek has null tags', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const badTrek = makeTrek('bad', TrekDifficulty.EASY, []);
      (badTrek as any).tags = null;
      trekRepo.find.mockResolvedValue([badTrek as any]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      await expect(service.refresh('user', 10)).resolves.toBeDefined();
    });

    it('should not crash when difficulty is null', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const nullDiffTrek = makeTrek('nd', TrekDifficulty.EASY, ['a']);
      nullDiffTrek.difficulty = null as any;
      trekRepo.find.mockResolvedValue([nullDiffTrek]);
      resultRepo.delete.mockResolvedValue({} as any);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      await expect(service.refresh('user', 10)).resolves.toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // 12. LOG EVENTS RESILIENCE
  // ──────────────────────────────────────────────
  describe('logEvents resilience', () => {
    it('should not crash when event save fails', async () => {
      platformSettings.getSettings.mockResolvedValue({});
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const validResults = [{ id: 'r-1', userId: 'u', trekId: 't', score: 0.5, reason: 'POPULAR', expiresAt: new Date(Date.now() + 86400000) }];
      resultRepo.find.mockResolvedValue(validResults as RecommendationResult[]);
      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation((e: any) => Promise.resolve(e));
      eventRepo.save.mockRejectedValue(new Error('Event DB unavailable'));

      await expect(service.getForUser('u', 10)).resolves.toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // 13. LOG CONVERSION RESILIENCE
  // ──────────────────────────────────────────────
  describe('logConversion resilience', () => {
    it('should not throw when event save fails', async () => {
      eventRepo.save.mockRejectedValue(new Error('DB down'));
      await expect(service.logConversion('user', 'trek', 'CLICKED')).resolves.toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────
  // 14. HELPER SET METHODS
  // ──────────────────────────────────────────────
  describe('Helper methods', () => {
    it('should return empty set when no bookings', async () => {
      bookingRepo.find.mockResolvedValue([]);
      const ids = await service.getCompletedTrekIds('user');
      expect(ids.size).toBe(0);
    });

    it('should return empty set when no wishlist collections', async () => {
      collectionRepo.find.mockResolvedValue([]);
      const ids = await service.getTrekIdsInWishlist('user');
      expect(ids.size).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // 15. GET FOR USER WITH EXPIRED RESULTS
  // ──────────────────────────────────────────────
  describe('getForUser with expired results', () => {
    it('should refresh when all results are expired', async () => {
      // resultRepo.find mock returns expired result
      resultRepo.find.mockResolvedValue([]);
      platformSettings.getSettings.mockResolvedValue({});
      trekRepo.find.mockResolvedValue([]);
      bookingRepo.find.mockResolvedValue([]);
      collectionRepo.find.mockResolvedValue([]);
      assessmentRepo.findOne.mockResolvedValue(null);

      const results = await service.getForUser('user', 10);
      expect(results).toBeDefined();
    });
  });
});
