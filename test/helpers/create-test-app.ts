import { Test } from '@nestjs/testing';
import { RedisService } from '../../src/common/utils/redis.service';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { DynamicModule, Type } from '@nestjs/common';

// Set required env vars for tests
const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'e2e-access-secret',
  JWT_REFRESH_SECRET: 'e2e-refresh-secret',
  JWT_TICKET_SECRET: 'e2e-ticket-secret',
  GLOBAL_API_KEY: 'test-api-key',
  API_KEY_HEADER: 'x-api-key',
  OTP_LENGTH: '6',
  OTP_EXPIRY_MINUTES: '10',
  OTP_MAX_ATTEMPTS: '5',
  WORKERS_ENABLED: 'false',
};
for (const [key, value] of Object.entries(TEST_ENV)) {
  process.env[key] = value;
}

/**
 * Creates a mock Redis client for testing.
 */
export function createMockRedisClient() {
  return {
    on: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    status: 'ready',
  };
}

/**
 * Creates a mock RedisService for testing.
 */
export function createMockRedisService() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Builds a NestJS test application from a module class with overridden
 * REDIS_CLIENT and RedisService providers so that no real Redis connections
 * are needed. (DataSource/TypeORM is already mocked via jest.mock in each
 * e2e test file.)
 */
export async function createTestApp(
  moduleClass: Type<any> | DynamicModule,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [moduleClass],
  })
    .overrideProvider('REDIS_CLIENT')
    .useValue(createMockRedisClient())
    .overrideProvider(RedisService)
    .useValue(createMockRedisService())
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
