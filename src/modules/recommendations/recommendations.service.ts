import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { Trek } from '../treks/entities/trek.entity';
import { TrekTag } from '../treks/entities/trek-tag.entity';
import { TrekDifficulty } from '../treks/enums/trek-difficulty.enum';
import { FitnessAssessment } from '../assessments/entities/fitness-assessment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { WishlistCollection } from '../wishlist/entities/wishlist-collection.entity';
import { WishlistItem } from '../wishlist/entities/wishlist-item.entity';
import { UserRecommendationPreference } from './entities/user-recommendation-preference.entity';
import { RecommendationResult } from './entities/recommendation-result.entity';
import { RecommendationEvent } from './entities/recommendation-event.entity';
import { PlatformSettingsService } from '../admin/platform-settings.service';
import { RecommendationPreferenceDto } from './dtos/recommendation-preference.dto';

const DEFAULT_WEIGHTS = {
  completedSimilarity: 0.3,
  wishlistSimilarity: 0.2,
  fitnessMatch: 0.2,
  seasonalScore: 0.15,
  popularityScore: 0.15,
  coldStartCompletedSimilarity: 0.1,
  coldStartWishlistSimilarity: 0.1,
  coldStartFitnessMatch: 0.15,
  coldStartSeasonalScore: 0.3,
  coldStartPopularityScore: 0.35,
};

interface Weights {
  completedSimilarity: number;
  wishlistSimilarity: number;
  fitnessMatch: number;
  seasonalScore: number;
  popularityScore: number;
  coldStartCompletedSimilarity: number;
  coldStartWishlistSimilarity: number;
  coldStartFitnessMatch: number;
  coldStartSeasonalScore: number;
  coldStartPopularityScore: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private weightsCache: Weights | null = null;
  private weightsCacheAt = 0;
  private readonly WEIGHTS_TTL = 3600000;

  constructor(
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(TrekTag)
    private readonly tagRepo: Repository<TrekTag>,
    @InjectRepository(FitnessAssessment)
    private readonly assessmentRepo: Repository<FitnessAssessment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(WishlistCollection)
    private readonly collectionRepo: Repository<WishlistCollection>,
    @InjectRepository(WishlistItem)
    private readonly itemRepo: Repository<WishlistItem>,
    @InjectRepository(UserRecommendationPreference)
    private readonly prefRepo: Repository<UserRecommendationPreference>,
    @InjectRepository(RecommendationResult)
    private readonly resultRepo: Repository<RecommendationResult>,
    @InjectRepository(RecommendationEvent)
    private readonly eventRepo: Repository<RecommendationEvent>,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  private async getWeights(): Promise<Weights> {
    if (
      this.weightsCache &&
      Date.now() - this.weightsCacheAt < this.WEIGHTS_TTL
    ) {
      return this.weightsCache;
    }
    try {
      const settings = await this.platformSettings.getSettings();
      const w = settings?.recommendationWeights as Partial<Weights> | undefined;
      this.weightsCache = { ...DEFAULT_WEIGHTS, ...w };
    } catch {
      this.weightsCache = { ...DEFAULT_WEIGHTS };
    }
    this.weightsCacheAt = Date.now();
    return this.weightsCache;
  }

  async getForUser(
    userId: string,
    limit = 10,
  ): Promise<RecommendationResult[]> {
    const results = await this.resultRepo.find({
      where: { userId, expiresAt: MoreThan(new Date()) },
      order: { score: 'DESC' },
      take: limit,
    });
    if (results.length > 0) {
      await this.logEvents(results, userId, 'SERVED');
      return results;
    }
    return this.refresh(userId, limit);
  }

  async getForTrek(
    trekId: string,
    limit = 10,
  ): Promise<{ trekId: string; score: number; reason: string }[]> {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId },
      relations: ['tags'],
    });
    if (!trek) return [];

    const allTreks = await this.trekRepo.find({
      where: { isPublished: true },
      relations: ['tags'],
    });

    const trekTags = new Set((trek.tags || []).map((t) => t.name));
    const scored = allTreks
      .filter((t) => t.id !== trekId)
      .map((t) => {
        const otherTags = new Set((t.tags || []).map((tg) => tg.name));
        const intersection = new Set(
          Array.from(trekTags).filter((x) => otherTags.has(x)),
        );
        const union = new Set([
          ...Array.from(trekTags),
          ...Array.from(otherTags),
        ]);
        const jaccard = union.size > 0 ? intersection.size / union.size : 0;
        const popBoost = Math.log1p(Number(t.popularityScore ?? 0)) * 0.01;
        return {
          trekId: t.id,
          score: jaccard * (1 + popBoost),
          reason: 'COMPLETED_SIMILAR',
        };
      });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async refresh(userId: string, limit = 10): Promise<RecommendationResult[]> {
    const scored = await this.buildForUser(userId);
    const top = scored.slice(0, limit);

    await this.resultRepo.delete({ userId });
    const expiresAt = new Date(Date.now() + 24 * 3600000);
    const entities = top.map((r) =>
      this.resultRepo.create({
        userId,
        trekId: r.trekId,
        score: r.score,
        reason: r.reason,
        expiresAt,
      }),
    );
    if (entities.length > 0) {
      await this.resultRepo.save(entities);
    }
    return entities;
  }

  async updatePreferences(
    userId: string,
    dto: RecommendationPreferenceDto,
  ): Promise<void> {
    let pref = await this.prefRepo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.prefRepo.create({ userId });
    }
    if (dto.preferredDifficulty !== undefined)
      pref.preferredDifficulty = dto.preferredDifficulty.map((d) =>
        d.toString(),
      );
    if (dto.preferredStates !== undefined)
      pref.preferredStates = dto.preferredStates;
    if (dto.maxBudget !== undefined) pref.maxBudget = dto.maxBudget;
    if (dto.preferredDurationDays !== undefined)
      pref.preferredDurationDays = dto.preferredDurationDays;
    if (dto.interests !== undefined) pref.interests = dto.interests as any;
    await this.prefRepo.save(pref);
  }

  async getPreferences(
    userId: string,
  ): Promise<UserRecommendationPreference | null> {
    return this.prefRepo.findOne({ where: { userId } });
  }

  async buildAll(): Promise<void> {
    const BATCH = 100;
    let offset = 0;
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 3600000);

    while (true) {
      const recentUsers = await this.bookingRepo
        .createQueryBuilder('b')
        .select('b.userId')
        .where('b.createdAt >= :cutoff', { cutoff: twoMonthsAgo })
        .groupBy('b.userId')
        .offset(offset)
        .limit(BATCH)
        .getRawMany();

      if (recentUsers.length === 0) break;

      const userIds = recentUsers.map((r: any) => r.b_userId || r.userId);
      const batchExpiresAt = new Date(Date.now() + 24 * 3600000);

      for (const uid of userIds) {
        try {
          const scored = await this.buildForUser(uid);
          const top = scored.slice(0, 20);
          await this.resultRepo.delete({ userId: uid });
          if (top.length > 0) {
            const entities = top.map((r) =>
              this.resultRepo.create({
                userId: uid,
                trekId: r.trekId,
                score: r.score,
                reason: r.reason,
                expiresAt: batchExpiresAt,
              }),
            );
            await this.resultRepo.save(entities);
          }
        } catch (err) {
          this.logger.error(
            `Recommendation build failed for user ${uid}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      offset += BATCH;
    }

    await this.resultRepo.delete({ expiresAt: LessThan(new Date()) });
  }

  async logConversion(
    userId: string,
    trekId: string,
    eventType: 'SERVED' | 'CLICKED' | 'BOOKED',
    resultId?: string,
    score?: number,
    reason?: string,
  ): Promise<void> {
    const event = this.eventRepo.create({
      userId,
      trekId,
      eventType,
      recommendationResultId: resultId ?? null,
      score: score ?? null,
      reason: reason ?? null,
    });
    await this.eventRepo
      .save(event)
      .catch((err) => this.logger.warn('Failed to log conversion event', err));
  }

  async getTrekIdsInWishlist(userId: string): Promise<Set<string>> {
    const collections = await this.collectionRepo.find({
      where: { userId },
      select: ['id'],
    });
    if (collections.length === 0) return new Set();
    const items = await this.itemRepo.find({
      where: collections.map((c) => ({ collectionId: c.id })),
      select: ['trekId'],
    });
    return new Set(items.map((i) => i.trekId));
  }

  async getCompletedTrekIds(userId: string): Promise<Set<string>> {
    const bookings = await this.bookingRepo.find({
      where: { userId, status: In(['CONFIRMED', 'COMPLETED']) },
      select: ['trekId'],
    });
    return new Set(bookings.map((b) => b.trekId));
  }

  private async buildForUser(
    userId: string,
  ): Promise<{ trekId: string; score: number; reason: string }[]> {
    const allTreks = await this.trekRepo.find({
      where: { isPublished: true },
      relations: ['tags'],
    });
    if (allTreks.length === 0) return [];

    const completedIds = await this.getCompletedTrekIds(userId);
    const wishlistIds = await this.getTrekIdsInWishlist(userId);
    const assessment = await this.assessmentRepo.findOne({
      where: { userId },
      order: { completedAt: 'DESC' },
    });
    // const pref = await this.prefRepo.findOne({ where: { userId } });

    const isColdStart = completedIds.size < 2 && wishlistIds.size < 3;
    const weights = await this.getWeights();

    const completedTagMap = await this.buildTagMapForTrekIds(completedIds);
    const wishlistTagMap = await this.buildTagMapForTrekIds(wishlistIds);

    const currentMonth = new Date().getMonth();

    const scored = allTreks
      .filter((t) => !completedIds.has(t.id))
      .map((trek) => {
        const trekTags = new Set((trek.tags || []).map((tg) => tg.name));
        const completedScore = this.computeJaccardMax(
          trekTags,
          completedTagMap,
        );
        const wishlistScore = this.computeJaccardMax(trekTags, wishlistTagMap);
        const fitnessScore = this.computeFitnessScore(
          trek.difficulty,
          assessment,
        );
        const seasonalScore = this.computeSeasonalScore(
          trek.startDate,
          currentMonth,
        );
        const popScore = this.computePopularityScore(
          Number(trek.popularityScore ?? 0),
          allTreks,
        );

        const w = isColdStart
          ? {
              cs: weights.coldStartCompletedSimilarity,
              ws: weights.coldStartWishlistSimilarity,
              fm: weights.coldStartFitnessMatch,
              ss: weights.coldStartSeasonalScore,
              ps: weights.coldStartPopularityScore,
            }
          : {
              cs: weights.completedSimilarity,
              ws: weights.wishlistSimilarity,
              fm: weights.fitnessMatch,
              ss: weights.seasonalScore,
              ps: weights.popularityScore,
            };

        const finalScore =
          w.cs * completedScore +
          w.ws * wishlistScore +
          w.fm * fitnessScore +
          w.ss * seasonalScore +
          w.ps * popScore;

        let reason = 'POPULAR';
        if (completedScore > 0.3) reason = 'COMPLETED_SIMILAR';
        else if (wishlistScore > 0.3) reason = 'WISHLIST_SIMILAR';
        else if (fitnessScore > 0.6) reason = 'FITNESS_MATCH';
        else if (seasonalScore > 0.5) reason = 'SEASONAL';
        else if (popScore > 0.6) reason = 'POPULAR';

        return { trekId: trek.id, score: finalScore, reason };
      });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  private async buildTagMapForTrekIds(
    ids: Set<string>,
  ): Promise<Map<string, Set<string>>> {
    if (ids.size === 0) return new Map();
    const treks = await this.trekRepo.find({
      where: { id: In(Array.from(ids)) },
      relations: ['tags'],
    });
    const map = new Map<string, Set<string>>();
    for (const t of treks) {
      map.set(t.id, new Set((t.tags || []).map((tg) => tg.name)));
    }
    return map;
  }

  private computeJaccardMax(
    trekTags: Set<string>,
    tagMap: Map<string, Set<string>>,
  ): number {
    if (tagMap.size === 0 || trekTags.size === 0) return 0;
    let maxScore = 0;
    for (const otherTags of tagMap.values()) {
      const intersection = new Set(
        Array.from(trekTags).filter((x) => otherTags.has(x)),
      );
      const union = new Set([
        ...Array.from(trekTags),
        ...Array.from(otherTags),
      ]);
      const score = union.size > 0 ? intersection.size / union.size : 0;
      if (score > maxScore) maxScore = score;
    }
    return maxScore;
  }

  private computeFitnessScore(
    difficulty: TrekDifficulty | null,
    assessment: FitnessAssessment | null,
  ): number {
    if (!difficulty || !assessment) return 0;
    const bracketScore: Record<string, number> = {
      EASY: 0.25,
      MODERATE: 0.5,
      DIFFICULT: 0.75,
      EXTREME: 1.0,
    };
    const userBracket = assessment.difficultyBracket;
    const trekVal = bracketScore[difficulty] ?? 0.5;
    const userVal = bracketScore[userBracket] ?? 0.5;
    if (trekVal <= userVal + 0.25 && trekVal >= userVal - 0.5) return 1;
    const diff = Math.abs(trekVal - userVal);
    return Math.max(0, 1 - diff);
  }

  private computeSeasonalScore(
    startDate: Date | null,
    currentMonth: number,
  ): number {
    if (!startDate) return 0;
    const trekMonth = new Date(startDate).getMonth();
    const diff = Math.abs(trekMonth - currentMonth);
    if (diff <= 1) return 1;
    if (diff <= 3) return 0.6;
    if (diff <= 6) return 0.2;
    return 0;
  }

  private computePopularityScore(popScore: number, allTreks: Trek[]): number {
    const maxPop = Math.max(
      ...allTreks.map((t) => Number(t.popularityScore ?? 0)),
      1,
    );
    return maxPop > 0 ? Math.min(popScore / maxPop, 1) : 0;
  }

  private async logEvents(
    results: RecommendationResult[],
    userId: string,
    eventType: 'SERVED',
  ): Promise<void> {
    const events = results.map((r) =>
      this.eventRepo.create({
        userId,
        trekId: r.trekId,
        eventType,
        recommendationResultId: r.id,
        score: r.score,
        reason: r.reason,
      }),
    );
    await this.eventRepo
      .save(events)
      .catch((err) => this.logger.warn('Failed to log served events', err));
  }
}
