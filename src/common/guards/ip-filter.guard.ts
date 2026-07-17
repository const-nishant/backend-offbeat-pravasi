import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { RedisClient } from '../utils/redis.client';
import type { Request } from 'express';

@Injectable()
export class IpFilterGuard implements CanActivate {
  private readonly logger = new Logger(IpFilterGuard.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: RedisClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket?.remoteAddress ?? '';

    if (!ip || ip === '::1' || ip === '127.0.0.1') {
      return true;
    }

    const allowlist = await this.redis.smembers('ip:allowlist');
    if (allowlist.some((entry) => ip.startsWith(entry.replace('*', '')))) {
      return true;
    }

    const blocklist = await this.redis.smembers('ip:blocklist');
    if (blocklist.some((entry) => ip.startsWith(entry.replace('*', '')))) {
      this.logger.warn(`Blocked request from IP: ${ip}`);
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
