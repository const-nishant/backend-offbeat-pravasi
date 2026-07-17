import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AdminImpersonationService {
  private readonly logger = new Logger(AdminImpersonationService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async start(userId: string, adminId: string, reason: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'JWT access secret not configured',
      );
    }

    const payload = {
      sub: userId,
      adminId,
      type: 'impersonation',
    };

    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: '900s',
    });

    await this.auditLogRepo.save({
      actorId: adminId,
      action: 'IMPERSONATION_START',
      resourceType: 'user',
      resourceId: userId,
      detail: { reason },
    });

    this.logger.log(`Admin ${adminId} impersonating user ${userId}`);

    return {
      token,
      expiresIn: 900,
      userId,
      adminId,
    };
  }

  async stop(adminId: string) {
    await this.auditLogRepo.save({
      actorId: adminId,
      action: 'IMPERSONATION_STOP',
      resourceType: 'system',
      detail: {},
    });

    this.logger.log(`Admin ${adminId} stopped impersonation`);
    return { success: true };
  }
}
