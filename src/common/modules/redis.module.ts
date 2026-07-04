import { Global, Module } from '@nestjs/common';
import { createRedisClient } from '../utils/redis.client';
import { RedisService } from '../utils/redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => createRedisClient(),
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
