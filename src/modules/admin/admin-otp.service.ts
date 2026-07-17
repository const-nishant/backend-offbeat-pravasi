import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateOtp } from '../../common/utils/otp.util';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import type { RedisClient } from '../../common/utils/redis.client';
import { CacheKeys } from '../../common/constants/cache.keys';

const MAX_DAILY_GENERATIONS = 3;
const OTP_TTL_SECONDS = 5 * 60;

@Injectable()
export class AdminOtpService {
  private readonly logger = new Logger(AdminOtpService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
  ) {}

  async generate(userId: string, adminId: string, reason: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.auditLogRepo
      .createQueryBuilder('a')
      .where('a.actorId = :adminId', { adminId })
      .andWhere('a.action = :action', { action: 'ADMIN_OTP_GENERATE' })
      .andWhere('a.resourceId = :userId', { userId })
      .andWhere('a.createdAt >= :since', { since })
      .getCount();

    if (count >= MAX_DAILY_GENERATIONS) {
      throw new BadRequestException(
        `Max ${MAX_DAILY_GENERATIONS} OTP generations per user per day reached`,
      );
    }

    const otp = generateOtp(Number(process.env.OTP_LENGTH ?? '6'));
    const email = user.email;
    if (!email) {
      throw new BadRequestException('User has no email address');
    }

    const key = CacheKeys.otpEmail(email);
    const payload = {
      otp,
      attempts: 0,
      createdAt: new Date().toISOString(),
      generatedBy: adminId,
    };

    await this.redis.set(key, JSON.stringify(payload), 'EX', OTP_TTL_SECONDS);

    await this.auditLogRepo.save({
      actorId: adminId,
      action: 'ADMIN_OTP_GENERATE',
      resourceType: 'user',
      resourceId: userId,
      detail: { reason, email },
    });

    this.logger.log(`Admin ${adminId} generated OTP for user ${userId}`);

    return {
      otp,
      email,
      expiresInSeconds: OTP_TTL_SECONDS,
    };
  }
}
