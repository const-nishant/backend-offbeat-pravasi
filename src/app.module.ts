import { Module, Global } from '@nestjs/common';
import { createRedisClient } from './common/utils/redis.client';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { RedisService } from './common/utils/redis.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ormConfig } from './config/ormconfig';
@Global()
@Module({
  imports: [TypeOrmModule.forRoot(ormConfig)],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => createRedisClient(),
    },
    RedisService,

    // global filters & guards
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: ValidationExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class AppModule {}
