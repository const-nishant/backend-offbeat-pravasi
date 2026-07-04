import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { JwtService } from '@nestjs/jwt';
import { AuthService, type TokenPair } from './auth.service';
import type { RedisService } from '../../common/utils/redis.service';
import type { MailerService } from '../mailer/mailer.service';
import type { User } from '../users/entities/user.entity';
import type { AnalyticsService } from '../analytics/analytics.service';
import { CacheKeys } from '../../common/constants/cache.keys';
import { hashPassword, verifyPassword } from '../../common/utils/hash.util';
import { generateOtp } from '../../common/utils/otp.util';
import argon2 from 'argon2';

// Mock all external utilities
jest.mock('../../common/utils/hash.util');
jest.mock('../../common/utils/otp.util');
jest.mock('argon2');

// Mock @thallesp/nestjs-better-auth to avoid ESM import issues
jest.mock('@thallesp/nestjs-better-auth', () => {
  class AuthService {}
  return { AuthService, AuthModule: { forRoot: () => ({ module: class {} }) } };
});
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/minimal', () => ({ betterAuth: jest.fn() }));

// Set required env vars before all tests
const origJwtAccess = process.env.JWT_ACCESS_SECRET;
const origJwtRefresh = process.env.JWT_REFRESH_SECRET;
beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});
afterAll(() => {
  process.env.JWT_ACCESS_SECRET = origJwtAccess;
  process.env.JWT_REFRESH_SECRET = origJwtRefresh;
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let mailerService: jest.Mocked<MailerService>;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let mockBetterAuth: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    fullName: 'Test User',
    emailVerified: false,
    isAdmin: false,
    organizerStatus: 'NONE',
    isOrganizerActive: false,
    isSuspended: false,
    username: null,
    phone: null,
    location: null,
    gender: null,
    dateOfBirth: null,
    profileImageUrl: null,
    bannerImageUrl: null,
    userPoints: 0,
    userDistanceTravelled: 0,
    organizerRating: 0,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as any;

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    mailerService = {
      sendOtpEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as any;

    analyticsService = { track: jest.fn().mockResolvedValue(undefined) } as any;

    mockBetterAuth = {
      api: { signInSocial: jest.fn(), getSession: jest.fn() },
    };

    service = new AuthService(
      userRepo as any,
      jwtService as any,
      redisService as any,
      mailerService as any,
      mockBetterAuth as any,
      analyticsService as any,
    );

    jest.clearAllMocks();
  });

  // ---------- REGISTER ----------
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const fullName = 'New User';

      userRepo.findOne.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      userRepo.create.mockReturnValue({
        ...mockUser,
        id: 'new-id',
        email,
      } as User);
      userRepo.save.mockResolvedValue({
        ...mockUser,
        id: 'new-id',
        email,
      } as User);
      redisService.set.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.register({ email, password, fullName });

      expect(result).toEqual({ userId: 'new-id' });
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(hashPassword).toHaveBeenCalledWith(password);
    });

    it('should throw ConflictException if email already registered', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should register without fullName when not provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      userRepo.create.mockReturnValue({
        ...mockUser,
        id: 'no-name-id',
        fullName: null,
      } as User);
      userRepo.save.mockResolvedValue({
        ...mockUser,
        id: 'no-name-id',
        fullName: null,
      } as User);
      redisService.set.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'noname@example.com',
        password: 'password123',
      });
      expect(result).toEqual({ userId: 'no-name-id' });
    });
  });

  // ---------- SEND OTP ----------
  describe('sendOtp', () => {
    it('should generate and store OTP, then send via email', async () => {
      (generateOtp as jest.Mock).mockReturnValue('123456');
      redisService.set.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.sendOtp({ email: 'test@example.com' });

      expect(result.message).toContain('OTP sent');
      expect(redisService.set).toHaveBeenCalled();
      expect(mailerService.sendOtpEmail).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
      );
    });

    it('should return success even if email sending fails', async () => {
      (generateOtp as jest.Mock).mockReturnValue('123456');
      redisService.set.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockRejectedValue(new Error('Email error'));

      const result = await service.sendOtp({ email: 'test@example.com' });
      expect(result.message).toContain('delayed');
    });
  });

  // ---------- VERIFY OTP ----------
  describe('verifyOtp', () => {
    const email = 'test@example.com';
    const otp = '123456';

    it('should verify OTP successfully', async () => {
      redisService.get.mockResolvedValue(
        JSON.stringify({
          otp: '123456',
          attempts: 0,
          createdAt: new Date().toISOString(),
        }),
      );
      redisService.del.mockResolvedValue(undefined);
      userRepo.findOne.mockResolvedValue(mockUser as User);
      userRepo.save.mockResolvedValue(mockUser as User);

      const result = await service.verifyOtp({ email, otp });
      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true }),
      );
    });

    it('should throw if OTP expired', async () => {
      redisService.get.mockResolvedValue(null);
      await expect(service.verifyOtp({ email, otp })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if max attempts exceeded', async () => {
      redisService.get.mockResolvedValue(
        JSON.stringify({
          otp: 'wrong',
          attempts: 5,
          createdAt: new Date().toISOString(),
        }),
      );
      redisService.del.mockResolvedValue(undefined);
      await expect(service.verifyOtp({ email, otp })).rejects.toThrow(
        'Too many failed attempts',
      );
    });

    it('should throw and increment attempts on wrong OTP', async () => {
      redisService.get.mockResolvedValue(
        JSON.stringify({
          otp: '999999',
          attempts: 0,
          createdAt: new Date().toISOString(),
        }),
      );
      redisService.set.mockResolvedValue(undefined);
      await expect(service.verifyOtp({ email, otp })).rejects.toThrow(
        'Invalid OTP',
      );
      expect(redisService.set).toHaveBeenCalledWith(
        CacheKeys.otpEmail(email),
        expect.stringContaining('"attempts":1'),
        expect.any(Number),
      );
    });

    it('should throw NotFoundException if user not found after valid OTP', async () => {
      redisService.get.mockResolvedValue(
        JSON.stringify({
          otp: '123456',
          attempts: 0,
          createdAt: new Date().toISOString(),
        }),
      );
      redisService.del.mockResolvedValue(undefined);
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyOtp({ email, otp })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------- LOGIN ----------
  describe('login', () => {
    it('should login successfully for verified user', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        passwordHash: 'hashed-password',
      } as User);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(service as any, 'createTokenPair')
        .mockResolvedValue(mockTokenPair);

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct',
      });
      expect(result).toEqual(mockTokenPair);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@user.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed',
      } as User);
      (verifyPassword as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for unverified email', async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        emailVerified: false,
        passwordHash: 'hashed',
      } as User);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin login from env vars', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      const adminHash = await argon2.hash('admin-pass');
      process.env.ADMIN_PASSWORD_HASHES = adminHash;

      // Admin user must exist in DB; admin env var overrides the password check
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        email: 'admin@example.com',
        isAdmin: false,
      } as User);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(service as any, 'createTokenPair')
        .mockResolvedValue(mockTokenPair);

      const result = await service.login({
        email: 'admin@example.com',
        password: 'admin-pass',
      });
      expect(result).toEqual(mockTokenPair);
    });
  });

  // ---------- REFRESH ----------
  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        sessionId: 'session-1',
        email: 'test@example.com',
        isAdmin: false,
      });
      redisService.get.mockResolvedValue('stored-hash');
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(service as any, 'createTokenPair')
        .mockResolvedValue(mockTokenPair);
      redisService.del.mockResolvedValue(undefined);

      const result = await service.refresh({
        refreshToken: 'valid-refresh-token',
      });
      expect(result).toEqual(mockTokenPair);
    });

    it('should throw if refresh secret not configured', async () => {
      const orig = process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      await expect(service.refresh({ refreshToken: 'token' })).rejects.toThrow(
        'JWT refresh secret not configured',
      );
      process.env.JWT_REFRESH_SECRET = orig;
    });

    it('should throw if refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid');
      });
      await expect(service.refresh({ refreshToken: 'bad' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if stored hash not found', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        sessionId: 'session-1',
        email: 'test@example.com',
        isAdmin: false,
      });
      redisService.get.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: 'token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ---------- LOGOUT ----------
  describe('logout', () => {
    it('should delete the refresh session key', async () => {
      redisService.del.mockResolvedValue(undefined);
      const result = await service.logout('user-1', 'session-1');
      expect(result).toEqual({ message: 'Logged out' });
      expect(redisService.del).toHaveBeenCalledWith(
        CacheKeys.refreshSession('user-1', 'session-1'),
      );
    });
  });

  // ---------- SOCIAL ----------
  describe('exchangeSocialSession', () => {
    it('should throw when better auth not configured', async () => {
      service = new AuthService(
        userRepo as any,
        jwtService as any,
        redisService as any,
        mailerService as any,
        null as any,
        analyticsService as any,
      );
      await expect(service.exchangeSocialSession({})).rejects.toThrow(
        'Auth provider not configured',
      );
    });
  });

  describe('getSocialAuthorizeUrl', () => {
    it('should return null when better auth not configured', async () => {
      service = new AuthService(
        userRepo as any,
        jwtService as any,
        redisService as any,
        mailerService as any,
        null as any,
        analyticsService as any,
      );
      const result = await service.getSocialAuthorizeUrl('google', {});
      expect(result).toBeNull();
    });
  });
});
