import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';
import type { RedisClient } from '../../common/utils/redis.client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('Health')
@AllowAnonymous()
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
    const result = await this.healthService.baseHealth();
    if (!result.success) {
      throw new ServiceUnavailableException(result);
    }
    return result;
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
