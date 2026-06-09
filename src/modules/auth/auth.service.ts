import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService as BetterAuthNestService } from '@thallesp/nestjs-better-auth';
import { RedisService } from '../../common/utils/redis.service';
import { generateOtp } from '../../common/utils/otp.util';
import { hashPassword, verifyPassword } from '../../common/utils/hash.util';
import { CacheKeys } from '../../common/constants/cache.keys';
import { MailerService } from '../mailer/mailer.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshDto } from './dtos/refresh.dto';
import { SendOtpDto } from './dtos/send-otp.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { User } from '../users/entities/user.entity';
import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import { fromNodeHeaders } from 'better-auth/node';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtAccessPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
  organizerStatus?: string;
}

interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  email: string;
  isAdmin: boolean;
  organizerStatus?: string;
}

@Injectable()
export class AuthService {
  // TTL config (in seconds)
  private readonly accessTokenTtl: string =
    process.env.JWT_ACCESS_TTL ?? '900s'; // string accepted by JwtService
  private readonly refreshTokenTtl: string =
    process.env.JWT_REFRESH_TTL ?? '30d';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
    // Better Auth API service (injected from @thallesp/nestjs-better-auth)
    private readonly betterAuthService: BetterAuthNestService,
  ) {}

  // -----------------
  // Registration
  // -----------------
  public async register(dto: RegisterDto): Promise<{ userId: string }> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName ?? null,
      emailVerified: false,
    });

    const saved = await this.userRepository.save(user);

    // send OTP on registration (async best-effort)
    try {
      await this.sendOtp({ email: dto.email });
    } catch {
      // do not block registration if OTP send fails; log server-side
      // Re-throw if you want to force OTP send success
    }

    return { userId: saved.id };
  }

  // -----------------
  // OTP flows (send, verify, resend)
  // -----------------
  private otpKeyFor(email: string): string {
    return CacheKeys.otpEmail(email);
  }

  public async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const otp = generateOtp(Number(process.env.OTP_LENGTH ?? '6'));
    const key = this.otpKeyFor(dto.email);
    const ttl = Number(process.env.OTP_EXPIRY_MINUTES ?? '10') * 60;

    const payload = {
      otp,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await this.redisService.set(key, JSON.stringify(payload), ttl);

    // Send OTP via email
    try {
      await this.mailerService.sendOtpEmail(dto.email, otp);
      return { message: 'OTP sent successfully to your email' };
    } catch {
      // Log error but don't fail the request - OTP is still stored in Redis
      // User can request a new OTP if email fails
      return {
        message:
          'OTP generated. Email delivery may be delayed. Please check your email shortly.',
      };
    }
  }

  // -----------------
  // Social / Better Auth helpers
  // -----------------
  public async getSocialAuthorizeUrl(
    providerId: string,
    reqHeaders: Record<string, any>,
  ): Promise<{ url: string } | null> {
    if (!this.betterAuthService) return null;

    const body = {
      provider: providerId,
      disableRedirect: true,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        `${process.env.APP_URL}/auth/google/callback`,
    } as any;

    // Call Better Auth's sign-in social endpoint programmatically
    // It returns an object with `url` when `disableRedirect: true`.
    const result = await (this.betterAuthService.api as any).signInSocial({
      body,
      headers: fromNodeHeaders(reqHeaders || {}),
    });

    return result?.url ? { url: result.url } : null;
  }

  public async exchangeSocialSession(
    reqHeaders: Record<string, any>,
  ): Promise<TokenPair> {
    if (!this.betterAuthService) {
      throw new InternalServerErrorException('Auth provider not configured');
    }

    const session = await (this.betterAuthService.api as any).getSession({
      headers: fromNodeHeaders(reqHeaders || {}),
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('No active social session');
    }

    const socialUser = session.user as any;
    if (!socialUser.email) {
      throw new UnauthorizedException('Social account does not provide email');
    }

    // Find or create local user
    let user = await this.userRepository.findOne({
      where: { email: socialUser.email },
    });
    if (!user) {
      user = this.userRepository.create({
        email: socialUser.email,
        passwordHash: null,
        fullName: socialUser.name ?? null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      } as Partial<User> as User);

      user = await this.userRepository.save(user);
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      await this.userRepository.save(user);
    }

    const tokens = await this.createTokenPair({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin ?? false,
      organizerStatus: user.organizerStatus ?? undefined,
    });

    return tokens;
  }

  public async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
    const key = this.otpKeyFor(dto.email);
    const stored = await this.redisService.get(key);
    if (!stored) {
      throw new UnauthorizedException('OTP expired or invalid');
    }

    type StoredOtp = {
      otp: string;
      attempts: number;
      createdAt: string;
    };

    let parsed: StoredOtp;
    try {
      parsed = JSON.parse(stored) as StoredOtp;
    } catch {
      await this.redisService.del(key);
      throw new UnauthorizedException('OTP invalid');
    }

    if (parsed.attempts >= Number(process.env.OTP_MAX_ATTEMPTS ?? '5')) {
      await this.redisService.del(key);
      throw new UnauthorizedException(
        'Too many failed attempts. Please request a new OTP.',
      );
    }

    if (dto.otp !== parsed.otp) {
      parsed.attempts = parsed.attempts + 1;
      await this.redisService.set(
        key,
        JSON.stringify(parsed),
        Number(process.env.OTP_EXPIRY_MINUTES ?? '10') * 60,
      );
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP valid: mark user as verified if exists
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      // If registration wasn't completed yet, keep it as verified flag for future or just return success
      await this.redisService.del(key);
      throw new NotFoundException('User not found');
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await this.userRepository.save(user);

    await this.redisService.del(key);

    return { message: 'Email verified successfully' };
  }

  // -----------------
  // Login + token creation
  // -----------------
  public async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: [
        'id',
        'email',
        'passwordHash',
        'isAdmin',
        'organizerStatus',
        'emailVerified',
      ] as (keyof User)[],
    } as unknown as any); // TypeORM typing: select array typing is verbose; cast is just for ts compile

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if this email is an env-defined admin
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const adminHashes = (process.env.ADMIN_PASSWORD_HASHES || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let isEnvAdmin = false;

    const adminIndex = adminEmails.findIndex(
      (e) => e.toLowerCase() === dto.email.toLowerCase(),
    );
    if (adminIndex !== -1) {
      const expectedHash = adminHashes[adminIndex];
      if (!expectedHash) {
        throw new UnauthorizedException('Admin password not configured');
      }
      // verify password against env hash
      try {
        const ok = await argon2.verify(expectedHash, dto.password);
        if (!ok) throw new UnauthorizedException('Invalid credentials');
        isEnvAdmin = true;
      } catch (e) {
        throw new UnauthorizedException(
          'Invalid credentials',
          e instanceof Error ? e.message : undefined,
        );
      }
    } else {
      // regular user password verification
      if (!user.passwordHash) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const passwordOk = await verifyPassword(user.passwordHash, dto.password);
      if (!passwordOk) {
        throw new UnauthorizedException('Invalid credentials');
      }
      if (!user.emailVerified) {
        throw new ForbiddenException('Please verify your email to continue');
      }
    }

    const tokens = await this.createTokenPair({
      userId: user.id,
      email: user.email,
      isAdmin: isEnvAdmin || (user.isAdmin ?? false),
      organizerStatus: user.organizerStatus ?? undefined,
    });

    return tokens;
  }

  // -----------------
  // Refresh
  // -----------------
  public async refresh(dto: RefreshDto): Promise<TokenPair> {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret)
      throw new InternalServerErrorException(
        'JWT refresh secret not configured',
      );

    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(dto.refreshToken, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedKey = CacheKeys.refreshSession(payload.sub, payload.sessionId);
    const storedHash = await this.redisService.get(storedKey);
    if (!storedHash) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // verify hash
    const matched = await argon2.verify(storedHash, dto.refreshToken);
    if (!matched) {
      // delete if mismatch to be safe
      await this.redisService.del(storedKey);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // rotate refresh token: create new sessionId and tokens
    const tokens = await this.createTokenPair({
      userId: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin ?? false,
      organizerStatus: payload.organizerStatus ?? undefined,
    });

    // delete old stored token
    await this.redisService.del(storedKey);

    return tokens;
  }

  // -----------------
  // Logout (invalidate a refresh token)
  // -----------------
  public async logout(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    const key = CacheKeys.refreshSession(userId, sessionId);
    await this.redisService.del(key);
    return { message: 'Logged out' };
  }

  // -----------------
  // Helpers: tokens + storage
  // -----------------
  private getAccessToken(
    userId: string,
    email: string,
    isAdmin: boolean,
    organizerStatus?: string,
  ): string {
    const payload: JwtAccessPayload = {
      sub: userId,
      email,
      isAdmin,
      organizerStatus,
    };

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret)
      throw new InternalServerErrorException(
        'JWT access secret not configured',
      );

    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.accessTokenTtl,
    } as any);

    return token;
  }

  private async createRefreshToken(
    userId: string,
    email: string,
    isAdmin: boolean,
    organizerStatus?: string,
  ): Promise<{ token: string; sessionId: string }> {
    const sessionId = randomUUID();

    const payload: JwtRefreshPayload = {
      sub: userId,
      sessionId,
      email,
      isAdmin,
      organizerStatus,
    };

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret)
      throw new InternalServerErrorException(
        'JWT refresh secret not configured',
      );

    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.refreshTokenTtl,
    } as any);

    // store hashed refresh token in redis with TTL (convert refreshTokenTtl into seconds when possible)
    const redisKey = CacheKeys.refreshSession(userId, sessionId);

    // compute TTL in seconds from JWT_REFRESH_TTL string when possible. As fallback, use 30 days in seconds.
    const fallbackTtlSeconds = 30 * 24 * 3600;
    let ttlSeconds = fallbackTtlSeconds;
    const raw = process.env.JWT_REFRESH_TTL ?? '30d';
    // Basic parsing: supports '30d', '30d', '86400s', '3600' etc.
    if (/^\d+d$/.test(raw)) {
      const days = Number(raw.replace('d', ''));
      ttlSeconds = days * 24 * 3600;
    } else if (/^\d+h$/.test(raw)) {
      const hours = Number(raw.replace('h', ''));
      ttlSeconds = hours * 3600;
    } else if (/^\d+m$/.test(raw)) {
      const minutes = Number(raw.replace('m', ''));
      ttlSeconds = minutes * 60;
    } else if (/^\d+s$/.test(raw)) {
      const secs = Number(raw.replace('s', ''));
      ttlSeconds = secs;
    } else if (/^\d+$/.test(raw)) {
      ttlSeconds = Number(raw);
    }

    const hashed = await argon2.hash(token);
    await this.redisService.set(redisKey, hashed, ttlSeconds);

    return { token, sessionId };
  }

  private async createTokenPair(input: {
    userId: string;
    email: string;
    isAdmin: boolean;
    organizerStatus?: string;
  }): Promise<TokenPair> {
    const accessToken = this.getAccessToken(
      input.userId,
      input.email,
      input.isAdmin,
      input.organizerStatus,
    );
    const refresh = await this.createRefreshToken(
      input.userId,
      input.email,
      input.isAdmin,
      input.organizerStatus,
    );

    return {
      accessToken,
      refreshToken: refresh.token,
    };
  }
}
