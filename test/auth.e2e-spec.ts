// Mock typeorm — only replace DataSource with a mock to avoid real DB connection
jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    query: jest.fn(),
    metadata: { columns: [], relations: [] },
    createQueryBuilder: jest.fn().mockReturnThis(),
  };
  const mockDataSource = {
    entityMetadatas: [],
    manager: {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
    },
    getRepository: jest.fn().mockReturnValue(mockRepo),
    destroy: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    options: { type: 'postgres' },
    name: 'default',
  };
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => mockDataSource),
  };
});
jest.mock('@thallesp/nestjs-better-auth', () => {
  class MockBetterAuthService {
    api = { signInSocial: jest.fn(), getSession: jest.fn() };
  }
  return {
    AuthService: MockBetterAuthService,
    AuthModule: {
      forRoot: () => ({
        module: class {},
        providers: [MockBetterAuthService],
        exports: [MockBetterAuthService],
      }),
    },
  };
});
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/minimal', () => ({ betterAuth: jest.fn() }));
jest.mock('bullmq', () => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    emit: jest.fn(),
  };
  return {
    Queue: jest.fn().mockImplementation(() => mockQueue),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
  };
});

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestApp } from './helpers/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp(AppModule);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /auth/register', () => {
    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
    });

    it('should validate password min length', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'test@example.com', password: '123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'bad', password: 'password123' })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'test@example.com' })
        .expect(400);
    });
  });

  describe('POST /auth/email/send-otp', () => {
    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/email/send-otp')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /auth/email/verify-otp', () => {
    it('should return 400 for missing otp', () => {
      return request(app.getHttpServer())
        .post('/auth/email/verify-otp')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'test@example.com' })
        .expect(400);
    });

    it('should return 400 for invalid otp length', () => {
      return request(app.getHttpServer())
        .post('/auth/email/verify-otp')
        .set('x-api-key', 'test-api-key')
        .send({ email: 'test@example.com', otp: '123' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 400 for missing refreshToken', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('x-api-key', 'test-api-key')
        .send({})
        .expect(400);
    });

    it('should return 400 for non-string refreshToken', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .set('x-api-key', 'test-api-key')
        .send({ refreshToken: 12345 })
        .expect(400);
    });
  });

  describe('GET /auth/google', () => {
    it('should return a response', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/google')
        .set('x-api-key', 'test-api-key');
      expect(res.status).toBeDefined();
    });
  });
});
