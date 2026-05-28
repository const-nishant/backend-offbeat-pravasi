import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Trek } from './entities/trek.entity';
import { TrekReview } from './entities/trek-review.entity';
import {
  TrekInteraction,
  InteractionType,
} from './entities/trek-interaction.entity';
import { TrekTag } from './entities/trek-tag.entity';
import { TrekImage } from './entities/trek-image.entity';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';
import { RedisService } from '../../common/utils/redis.service';

@Injectable()
export class TreksService {
  constructor(
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(TrekReview)
    private readonly reviewRepo: Repository<TrekReview>,
    @InjectRepository(TrekInteraction)
    private readonly interactionRepo: Repository<TrekInteraction>,
    @InjectRepository(TrekTag)
    private readonly tagRepo: Repository<TrekTag>,
    @InjectRepository(TrekImage)
    private readonly imageRepo: Repository<TrekImage>,
    private readonly redisService: RedisService,
  ) {}

  async createTrek(payload: any) {
    const { tags, imageKeys, ...rest } = payload;
    const trek = this.trekRepo.create(rest as any) as unknown as Trek;

    if (Array.isArray(tags) && tags.length > 0) {
      const normalized = tags.map((t: string) => t.trim());
      const existing = await this.tagRepo.find({
        where: { name: In(normalized) },
      });
      const existingNames = new Set(existing.map((e) => e.name));
      const toCreate = normalized.filter((n: string) => !existingNames.has(n));
      const created = toCreate.map((name: string) =>
        this.tagRepo.create({ name }),
      );
      if (created.length) await this.tagRepo.save(created);
      const allTags = await this.tagRepo.find({
        where: { name: In(normalized) },
      });
      trek.tags = allTags;
    }

    const saved = await this.trekRepo.save(trek);

    if (Array.isArray(imageKeys) && imageKeys.length > 0) {
      const images = imageKeys.map((k: string, idx: number) =>
        this.imageRepo.create({
          trek: saved as unknown as any,
          key: k,
          isPrimary: idx === 0,
          order: idx,
        } as any),
      ) as unknown as TrekImage[];
      await this.imageRepo.save(images);
    }

    return saved;
  }

  async findOne(id: string) {
    return this.trekRepo.findOne({
      where: { id },
      relations: ['images', 'tags'],
    });
  }

  async search(params: any) {
    const { page, limit, q, state, difficulty, minCost, maxCost, sort, tags } =
      params;
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });

    const qb = this.trekRepo.createQueryBuilder('trek');
    qb.where('trek.deletedAt IS NULL');

    if (q) {
      qb.andWhere(
        "to_tsvector('english', coalesce(trek.name,'') || ' ' || coalesce(trek.location,'') || ' ' || coalesce(trek.fullDescription,'')) @@ plainto_tsquery(:q)",
        { q },
      );
      qb.addSelect(
        "ts_rank_cd(to_tsvector('english', coalesce(trek.name,'') || ' ' || coalesce(trek.location,'') || ' ' || coalesce(trek.fullDescription,'')), plainto_tsquery(:q))",
        'rank',
      );
    }

    if (state) qb.andWhere('trek.state = :state', { state });
    if (difficulty)
      qb.andWhere('trek.difficulty = :difficulty', { difficulty });
    if (minCost !== undefined)
      qb.andWhere('trek.costInr >= :minCost', { minCost });
    if (maxCost !== undefined)
      qb.andWhere('trek.costInr <= :maxCost', { maxCost });

    if (tags && Array.isArray(tags) && tags.length > 0) {
      qb.innerJoin('trek.tags', 'tag').andWhere('tag.name IN (:...tags)', {
        tags,
      });
    }

    if (sort === 'relevance' && q) qb.orderBy('rank', 'DESC');
    else if (sort === 'newest') qb.orderBy('trek.startDate', 'DESC');
    else if (sort === 'popular') qb.orderBy('trek.popularityScore', 'DESC');
    else qb.orderBy('trek.createdAt', 'DESC');

    qb.skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();
    return { data: items, meta: buildPaginationMeta(p, l, total) };
  }

  async nearby(
    lat: number,
    lon: number,
    radiusMeters: number,
    page = 1,
    limit = 20,
  ) {
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });

    const qb = this.trekRepo
      .createQueryBuilder('trek')
      .where('trek.deletedAt IS NULL')
      .andWhere('trek.geom IS NOT NULL')
      .andWhere(
        'ST_DWithin(trek.geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radius)',
        { lat, lon, radius: radiusMeters },
      )
      .addSelect(
        'ST_Distance(trek.geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)',
        'distance',
      )
      .orderBy('distance', 'ASC')
      .skip(skip)
      .take(take);

    const raw = await qb.getRawAndEntities();
    const items = raw.entities;

    const countQb = this.trekRepo
      .createQueryBuilder('t')
      .where('t.deletedAt IS NULL')
      .andWhere(
        'ST_DWithin(t.geom::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radius)',
        { lat, lon, radius: radiusMeters },
      );
    const total = await countQb.getCount();

    const distances: Record<string, number> = {};
    for (let i = 0; i < raw.raw.length; i++) {
      const row = raw.raw[i];
      const id = raw.entities[i].id;
      distances[id] = Number(
        row.distance ?? row.st_distance ?? row.st_distance,
      );
    }

    const results = items.map((it) => ({
      ...it,
      distanceMeters: distances[it.id] ?? null,
    }));
    return { data: results, meta: buildPaginationMeta(p, l, total) };
  }

  async getRecommendations(
    userId: string | null,
    lat?: number,
    lon?: number,
    limit = 10,
  ) {
    if (userId) {
      const cacheKey = `user:recs:${userId}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const interactions = await this.interactionRepo.find({
        where: { user: { id: userId } },
        order: { createdAt: 'DESC' },
        take: 20,
      });
      const seedIds = Array.from(
        new Set(interactions.map((i) => (i as any).trek.id)),
      );

      const scoreMap = new Map<string, number>();
      const weights: Record<string, number> = {
        VIEW: 1,
        BOOKMARK: 2,
        BOOKING: 3,
        LIKE: 1.5,
      };

      for (const sid of seedIds) {
        const raw = await this.redisService.get(`trek:similar:${sid}`);
        if (!raw) continue;
        const list = JSON.parse(raw) as Array<{ id: string; score: number }>;
        const intType =
          interactions.find((it) => (it as any).trek.id === sid)?.type ??
          InteractionType.VIEW;
        const seedWeight = weights[intType] ?? 1;

        for (const c of list) {
          const prev = scoreMap.get(c.id) ?? 0;
          scoreMap.set(c.id, prev + c.score * seedWeight);
        }
      }

      const candidates = Array.from(scoreMap.entries())
        .map(([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (candidates.length < limit) {
        const remaining = limit - candidates.length;
        const popular = await this.trekRepo
          .createQueryBuilder('t')
          .where('t.deletedAt IS NULL')
          .orderBy('t.popularityScore', 'DESC')
          .take(remaining)
          .getMany();
        for (const p of popular)
          if (!candidates.find((c) => c.id === p.id))
            candidates.push({ id: p.id, score: 0 });
      }

      const ids = candidates.map((c) => c.id);
      const treks = await this.trekRepo.findBy({ id: In(ids) });
      const ordered = ids
        .map((id) => treks.find((t) => t.id === id))
        .filter(Boolean) as Trek[];

      await this.redisService.set(cacheKey, JSON.stringify(ordered), 8 * 3600);
      return ordered.slice(0, limit);
    }

    const popular = await this.trekRepo
      .createQueryBuilder('t')
      .where('t.deletedAt IS NULL')
      .orderBy('t.popularityScore', 'DESC')
      .take(limit)
      .getMany();
    return popular;
  }
}
