// Mock ESM modules before all imports
jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthService: class AuthService {},
  AuthModule: { forRoot: () => ({ module: class {} }) },
}));
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/minimal', () => ({ betterAuth: jest.fn() }));

import { DataSource, Repository, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { RedisService } from '../../common/utils/redis.service';
import { MailerService } from '../mailer/mailer.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { SendOtpDto } from './dtos/send-otp.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { generateOtp } from '../../common/utils/otp.util';
import argon2 from 'argon2';

jest.mock('../../common/utils/otp.util');

// SQLite-compatible User entity (replaces enum columns with varchar)
@Entity({ name: 'users' })
class SqliteUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 120 }) email!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) passwordHash!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) fullName!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) username!: string | null;
  @Column({ type: 'varchar', nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', nullable: true }) location!: string | null;
  @Column({ type: 'varchar', nullable: true }) gender!: string | null;
  @Column({ type: 'date', nullable: true }) dateOfBirth!: Date | null;
  @Column({ type: 'varchar', nullable: true }) profileImageUrl!: string | null;
  @Column({ type: 'varchar', nullable: true }) bannerImageUrl!: string | null;
  @Column({ type: 'boolean', default: false }) isAdmin!: boolean;
  @Column({ type: 'varchar', default: 'NONE' }) organizerStatus!: string;
  @Column({ type: 'boolean', default: false }) emailVerified!: boolean;
  @Column({ type: 'datetime', nullable: true }) emailVerifiedAt!: Date | null;
  @Column({ type: 'float', default: 0 }) userPoints!: number;
  @Column({ type: 'int', default: 0 }) userDistanceTravelled!: number;
  @Column({ type: 'float', default: 0 }) organizerRating!: number;
  @Column({ type: 'boolean', default: false }) isOrganizerActive!: boolean;
  @Column({ type: 'boolean', default: false }) isSuspended!: boolean;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'datetime' }) updatedAt!: Date;
}

describe('AuthService Integration (sqlite)', () => {
  let dataSource: DataSource;
  let userRepo: Repository<SqliteUser>;
  let service: AuthService;
  let redisService: jest.Mocked<RedisService>;
  let mailerService: jest.Mocked<MailerService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [SqliteUser],
    });
    await dataSource.initialize();
    userRepo = dataSource.getRepository(SqliteUser);

    // Setup env
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.OTP_LENGTH = '6';
    process.env.OTP_EXPIRY_MINUTES = '10';
    process.env.OTP_MAX_ATTEMPTS = '5';

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    mailerService = {
      sendOtpEmail: jest.fn(),
      sendEmail: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
      verify: jest.fn(),
    } as any;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Clear the database
    await userRepo.clear();
    jest.clearAllMocks();

    service = new AuthService(
      userRepo,
      jwtService as any,
      redisService as any,
      mailerService as any,
      {} as any, // betterAuthService
    );
  });

  describe('register + verify flow', () => {
    const email = 'integration@test.com';

    it('should register a user and persist to database', async () => {
      // Use real password hashing (argon2 is real, hash.util is not mocked)
      redisService.set.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      const dto: RegisterDto = { email, password: 'StrongPass1' };
      const result = await service.register(dto);

      expect(result.userId).toBeDefined();

      const saved = await userRepo.findOne({ where: { email } });
      expect(saved).toBeDefined();
      expect(saved!.email).toBe(email);
      expect(saved!.emailVerified).toBe(false);
    });

    it('should fail to register duplicate email', async () => {
      // Manually insert a user
      const existing = userRepo.create({
        email,
        passwordHash: 'hash',
        emailVerified: false,
      });
      await userRepo.save(existing);

      const dto: RegisterDto = { email, password: 'StrongPass1' };
      await expect(service.register(dto)).rejects.toThrow(
        'Email already registered',
      );
    });
  });

  describe('sendOtp + verifyOtp flow', () => {
    const email = 'otp-test@example.com';

    it('should store OTP in redis and verify it', async () => {
      (generateOtp as jest.Mock).mockReturnValue('654321');
      const storedOtp = JSON.stringify({
        otp: '654321',
        attempts: 0,
        createdAt: new Date().toISOString(),
      });

      redisService.set.mockResolvedValue(undefined);
      mailerService.sendOtpEmail.mockResolvedValue(undefined);

      // Send OTP
      const sendDto: SendOtpDto = { email };
      const sendResult = await service.sendOtp(sendDto);
      expect(sendResult.message).toContain('OTP sent');

      // Verify OTP - mock redis get to return the stored OTP
      redisService.get.mockResolvedValue(storedOtp);
      redisService.del.mockResolvedValue(undefined);

      // User must exist for verifyOtp
      const user = userRepo.create({
        email,
        passwordHash: 'hash',
        emailVerified: false,
      });
      await userRepo.save(user);

      const verifyDto: VerifyOtpDto = { email, otp: '654321' };
      const verifyResult = await service.verifyOtp(verifyDto);
      expect(verifyResult.message).toBe('Email verified successfully');

      // Check user was updated in DB
      const updated = await userRepo.findOne({ where: { email } });
      expect(updated!.emailVerified).toBe(true);
    });

    it('should reject wrong OTP', async () => {
      const storedOtp = JSON.stringify({
        otp: '111111',
        attempts: 0,
        createdAt: new Date().toISOString(),
      });
      redisService.get.mockResolvedValue(storedOtp);
      redisService.set.mockResolvedValue(undefined);

      const verifyDto: VerifyOtpDto = { email, otp: '999999' };
      await expect(service.verifyOtp(verifyDto)).rejects.toThrow('Invalid OTP');
    });
  });

  describe('login with real password hashing', () => {
    const email = 'login-test@example.com';
    const password = 'Password123!';

    beforeEach(async () => {
      // Create a real user with real hashed password
      const realHash = await argon2.hash(password);
      const user = userRepo.create({
        email,
        passwordHash: realHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });
      await userRepo.save(user);
    });

    it('should login with correct credentials', async () => {
      jest.spyOn(service as any, 'createTokenPair').mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      } as any);

      const dto: LoginDto = { email, password };
      const result = await service.login(dto);
      expect(result).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
      });
    });

    it('should reject wrong password', async () => {
      const dto: LoginDto = { email, password: 'WrongPassword1' };
      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });
});
