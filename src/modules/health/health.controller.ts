import { Controller, Get, Inject } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';
import type { RedisClient } from '../../common/utils/redis.client';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
  ) {}

  @Public()
  @Get()
  base() {
    return this.healthService.baseHealth();
  }

  @Public()
  @Get('redis')
  async redisCheck() {
    const pong = await this.redis.ping();
    return {
      success: true,
      message: 'Redis OK',
      data: { pong },
    };
  }
}
