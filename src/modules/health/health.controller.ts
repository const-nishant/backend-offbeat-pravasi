import { Controller, Get, Inject } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';
import type { RedisClient } from '../../common/utils/redis.client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Base health check (includes Redis + DB liveness)' })
  async base() {
    return this.healthService.baseHealth();
  }

  @Public()
  @Get('redis')
  @ApiOperation({ summary: 'Redis health check' })
  async redisCheck() {
    const pong = await this.redis.ping();
    return {
      success: true,
      message: 'Redis OK',
      data: { pong },
    };
  }
}
