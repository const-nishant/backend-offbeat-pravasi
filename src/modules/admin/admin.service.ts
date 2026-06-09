import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OrganizerService } from '../organizer/organizer.service';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UpdateOrganizerRequestDto } from '../organizer/dtos/update-organizer-request.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly auditLogService: AuditLogService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly organizerService: OrganizerService,
  ) {}

  async recordAction(
    actor: any,
    action: string,
    resourceType?: string,
    resourceId?: string,
    detail?: any,
    req?: any,
  ) {
    const entry = {
      actorId: actor?.id,
      actorEmail: actor?.email ? `${String(actor.email).slice(0, 3)}***` : null,
      actorRole: actor?.isAdmin ? 'ADMIN' : 'USER',
      action,
      resourceType,
      resourceId,
      detail,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      userAgent: req?.headers?.['user-agent'] || null,
    };
    return this.auditLogService.save(entry);
  }

  async listUsers(filters: any, page = 1, limit = 20) {
    const qb = this.userRepo.createQueryBuilder('u');
    if (filters.query) {
      qb.where(
        '(u.email ILIKE :q OR u.fullName ILIKE :q OR u.username ILIKE :q)',
        {
          q: `%${filters.query}%`,
        },
      );
    }
    if (filters.organizerStatus)
      qb.andWhere('u.organizerStatus = :os', { os: filters.organizerStatus });
    if (filters.isSuspended !== undefined)
      qb.andWhere('u.isSuspended = :s', { s: filters.isSuspended });

    qb.orderBy('u.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor?: any,
    req?: any,
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.isSuspended !== undefined) user.isSuspended = dto.isSuspended;
    if (dto.organizerStatus !== undefined)
      user.organizerStatus = dto.organizerStatus as any;
    await this.userRepo.save(user);
    await this.recordAction(actor, 'USER_STATUS_UPDATED', 'user', id, dto, req);
    return user;
  }

  async decideOrganizerRequest(
    id: string,
    decisionDto: { decision: 'APPROVE' | 'REJECT'; note?: string },
    actor?: any,
    req?: any,
  ) {
    const dto: UpdateOrganizerRequestDto = {
      adminNotes: decisionDto.note,
      status:
        decisionDto.decision === 'APPROVE'
          ? ('APPROVED' as any)
          : ('REJECTED' as any),
      reviewedAt: new Date().toISOString(),
    };

    const app = await this.organizerService.updateApplication(id, dto);
    await this.recordAction(
      actor,
      'ORGANIZER_REQUEST_DECIDED',
      'organizer_request',
      id,
      dto,
      req,
    );
    return app;
  }
}
