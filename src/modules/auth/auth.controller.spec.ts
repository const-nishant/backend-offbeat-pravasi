// Mock ESM modules before all imports
jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthService: class AuthService {},
  AuthModule: { forRoot: () => ({ module: class {} }) },
}));
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/minimal', () => ({ betterAuth: jest.fn() }));

import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService, type TokenPair } from './auth.service';
import type { RegisterDto } from './dtos/register.dto';
import type { LoginDto } from './dtos/login.dto';
import type { SendOtpDto } from './dtos/send-otp.dto';
import type { VerifyOtpDto } from './dtos/verify-otp.dto';
import type { RefreshDto } from './dtos/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockTokenPair: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    isAdmin: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            sendOtp: jest.fn(),
            verifyOtp: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            getSocialAuthorizeUrl: jest.fn(),
            exchangeSocialSession: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register and return result', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      authService.register.mockResolvedValue({ userId: 'user-1' });

      const result = await controller.register(dto);

      expect(result).toEqual({ userId: 'user-1' });
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login and return formatted response', async () => {
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      authService.login.mockResolvedValue(mockTokenPair);

      const result = await controller.login(dto);

      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: mockTokenPair,
      });
      expect(authService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('sendOtp', () => {
    it('should call authService.sendOtp', async () => {
      const dto: SendOtpDto = { email: 'test@example.com' };
      authService.sendOtp.mockResolvedValue({
        message: 'OTP sent successfully to your email',
      });

      const result = await controller.sendOtp(dto);

      expect(result).toEqual({
        message: 'OTP sent successfully to your email',
      });
      expect(authService.sendOtp).toHaveBeenCalledWith(dto);
    });
  });

  describe('verifyOtp', () => {
    it('should call authService.verifyOtp', async () => {
      const dto: VerifyOtpDto = {
        email: 'test@example.com',
        otp: '123456',
      };
      authService.verifyOtp.mockResolvedValue({
        message: 'Email verified successfully',
      });

      const result = await controller.verifyOtp(dto);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(authService.verifyOtp).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh', async () => {
      const dto: RefreshDto = { refreshToken: 'some-refresh-token' };
      authService.refresh.mockResolvedValue(mockTokenPair);

      const result = await controller.refresh(dto);

      expect(result).toEqual(mockTokenPair);
      expect(authService.refresh).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with sessionId', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out' });

      const req = { sessionId: 'session-1' } as any;

      const result = await controller.logout(mockUser, req);

      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
        data: {},
      });
      expect(authService.logout).toHaveBeenCalledWith('user-1', 'session-1');
    });

    it('should handle logout without sessionId', async () => {
      const req = {} as any;

      const result = await controller.logout(mockUser, req);

      expect(result).toEqual({
        success: true,
        message: 'Session ended',
        data: {},
      });
      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('should return current user', () => {
      const result = controller.me(mockUser);

      expect(result).toEqual({
        success: true,
        message: 'User profile fetched',
        data: mockUser,
      });
    });
  });

  describe('googleAuth', () => {
    it('should return authorize URL from service', async () => {
      authService.getSocialAuthorizeUrl.mockResolvedValue({
        url: 'https://accounts.google.com/o/oauth2/auth?...',
      });

      const req = { headers: { host: 'localhost' } } as any;
      const result = await controller.googleAuth(req);

      expect(result).toEqual({
        success: true,
        message: 'Redirect to Google',
        data: { url: 'https://accounts.google.com/o/oauth2/auth?...' },
      });
    });

    it('should return failure if no URL returned', async () => {
      authService.getSocialAuthorizeUrl.mockResolvedValue(null);

      const req = { headers: {} } as any;
      const result = await controller.googleAuth(req);

      expect(result).toEqual({
        success: false,
        message: 'Unable to get Google authorize URL',
        data: {},
      });
    });
  });

  describe('googleExchange', () => {
    it('should exchange social session for tokens', async () => {
      authService.exchangeSocialSession.mockResolvedValue(mockTokenPair);

      const req = { headers: { cookie: 'session=xyz' } } as any;
      const result = await controller.googleExchange(req);

      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: mockTokenPair,
      });
      expect(authService.exchangeSocialSession).toHaveBeenCalledWith(
        req.headers,
      );
    });
  });
});
