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

// Mock ESM modules (must be before all imports — jest hoists these)
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

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp(AppModule);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /payments/checkout', () => {
    it('should return 401 when no auth token provided', () => {
      return request(app.getHttpServer())
        .post('/payments/checkout')
        .set('x-api-key', 'test-api-key')
        .set('Authorization', '')
        .send({ bookingId: 1, provider: 'stripe' })
        .expect(401);
    });
  });

  describe('POST /payments/webhook/stripe', () => {
    it('should return 400 for missing stripe-signature header', () => {
      return request(app.getHttpServer())
        .post('/payments/webhook/stripe')
        .set('x-api-key', 'test-api-key')
        .send({})
        .expect(400);
    });
  });

  describe('POST /payments/webhook/razorpay', () => {
    it('should return 400 for missing razorpay-signature header', () => {
      return request(app.getHttpServer())
        .post('/payments/webhook/razorpay')
        .set('x-api-key', 'test-api-key')
        .send({})
        .expect(400);
    });
  });
});
