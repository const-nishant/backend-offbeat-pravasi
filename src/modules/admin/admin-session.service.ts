import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import type { RedisClient } from '../../common/utils/redis.client';

interface SessionInfo {
  sessionId: string;
  userId: string;
  ageSeconds: number;
  key: string;
}

@Injectable()
export class AdminSessionService {
  private readonly logger = new Logger(AdminSessionService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClient) {}

  async listSessions() {
    const sessions: SessionInfo[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'refresh:*',
        'COUNT',
        200,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 3) {
          const userId = parts[1];
          const sessionId = parts.slice(2).join(':');
          const ttl = await this.redis.ttl(key);
          if (ttl > 0) {
            sessions.push({
              sessionId,
              userId,
              ageSeconds: ttl,
              key,
            });
          }
        }
      }
    } while (cursor !== '0');

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      userId: s.userId,
      ageSeconds: s.ageSeconds,
      ageHours: Math.round((s.ageSeconds / 3600) * 100) / 100,
      expiresAt: new Date(Date.now() + s.ageSeconds * 1000).toISOString(),
    }));
  }

  async revokeSession(sessionId: string) {
    let deleted = false;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `refresh:*:${sessionId}`,
        'COUNT',
        200,
      );
      cursor = nextCursor;

      for (const key of keys) {
        await this.redis.del(key);
        deleted = true;
        this.logger.log(`Revoked session key: ${key}`);
      }
    } while (cursor !== '0');

    if (!deleted) {
      const exactKey = `refresh:${sessionId}`;
      const exists = await this.redis.exists(exactKey);
      if (exists) {
        await this.redis.del(exactKey);
        deleted = true;
      }
    }

    if (!deleted) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return { success: true, sessionId };
  }

  async revokeUserSessions(userId: string) {
    let count = 0;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `refresh:${userId}:*`,
        'COUNT',
        200,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        count += keys.length;
      }
    } while (cursor !== '0');

    this.logger.log(`Revoked ${count} sessions for user ${userId}`);
    return { success: true, userId, revokedCount: count };
  }
}
