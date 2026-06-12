import { Test, type TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import type { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // The UsersService is currently empty (no methods).
  // These tests serve as placeholders for when methods are added.
  describe('placeholder', () => {
    it('has empty service body that compiles', () => {
      // The service is defined and injectable
      expect(service.constructor).toBeDefined();
    });
  });
});
