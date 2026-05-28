import { Worker } from 'bullmq';
import { createRedisClient } from '../../common/utils/redis.client';
import { DataSource } from 'typeorm';
import { ormConfig } from '../../config/ormconfig';
import { Trek } from '../../modules/treks/entities/trek.entity';

const host = process.env.REDIS_HOST ?? '127.0.0.1';
const port = Number(process.env.REDIS_PORT ?? 6379);
const password = process.env.REDIS_PASSWORD;

const redis = createRedisClient();

const worker = new Worker(
  'recommendation-builder-queue',
  async (_job) => {
    // Build item-item similarities based on tags (Jaccard)
    const ds = new DataSource({ ...(ormConfig as any), synchronize: false });
    await ds.initialize();
    const trekRepo = ds.getRepository(Trek);

    const treks = await trekRepo.find({
      relations: ['tags'],
      select: ['id', 'popularityScore'] as any,
    });

    // map id -> Set(tags)
    const tagMap = new Map<string, Set<string>>();
    const popMap = new Map<string, number>();

    for (const t of treks) {
      const tags = (t as any).tags || [];
      tagMap.set(t.id, new Set(tags.map((x: any) => x.name)));
      popMap.set(t.id, Number((t as any).popularityScore ?? 0));
    }

    const ids = Array.from(tagMap.keys());
    const K = 50;

    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      const setA = tagMap.get(a) || new Set();
      const sims: { id: string; score: number }[] = [];

      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue;
        const b = ids[j];
        const setB = tagMap.get(b) || new Set();
        const inter = new Set(Array.from(setA).filter((x) => setB.has(x))).size;
        const uni =
          new Set([...Array.from(setA), ...Array.from(setB)]).size || 1;
        let score = inter / uni; // Jaccard

        // boost by popularity (small factor)
        const popB = popMap.get(b) ?? 0;
        const popBoost = Math.log1p(popB) * 0.01;
        score = score * (1 + popBoost);

        if (score > 0) sims.push({ id: b, score });
      }

      sims.sort((x, y) => y.score - x.score);
      const top = sims.slice(0, K);

      // store in redis key
      const key = `trek:similar:${a}`;
      await redis.set(key, JSON.stringify(top), 'EX', 8 * 3600); // TTL 8h
    }

    await ds.destroy();
  },
  {
    connection: { host, port, password },
  },
);

worker.on('completed', (job) => {
  console.log('Recommendation job completed', job.id);
});

worker.on('failed', (job, err) => {
  console.error('Recommendation job failed', job?.id, err?.message);
});
