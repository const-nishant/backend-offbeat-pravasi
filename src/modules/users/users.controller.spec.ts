import { Test, type TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [UsersService],
    })
      .overrideProvider(UsersService)
      .useValue({})
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // The UsersController is currently empty (no routes).
  // These tests serve as placeholders.
  describe('constructor', () => {
    it('should create instance with usersService', () => {
      expect(controller).toBeInstanceOf(UsersController);
    });
  });
});
