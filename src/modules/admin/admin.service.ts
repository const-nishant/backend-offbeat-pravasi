import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OrganizerService } from '../organizer/organizer.service';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UpdateOrganizerRequestDto } from '../organizer/dtos/update-organizer-request.dto';
import { PlatformSettings } from './entities/platform-settings.entity';
import { Queue } from 'bullmq';
import { redisConfig } from '../../config/redis.config';

@Injectable()
export class AdminService {
  constructor(
    private readonly auditLogService: AuditLogService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly organizerService: OrganizerService,
    @InjectRepository(PlatformSettings)
    private readonly settingsRepo: Repository<PlatformSettings>,
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

  async enqueueTicketPdfJob(bookingId: string, actor?: any) {
    const queue = new Queue('ticket-pdf-queue', {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
      },
    });
    const job = await queue.add('generate-pdf', { bookingId });
    await this.recordAction(actor, 'ENQUEUE_TICKET_PDF', 'booking', bookingId, {
      jobId: job.id,
    });
    return { enqueued: true, jobId: job.id };
  }

  async getPlatformSettings() {
    const row = await this.settingsRepo.findOne({
      where: { key: 'platform_settings' },
    });
    return row?.settings || {};
  }

  async updatePlatformSettings(settings: any, actor: any) {
    let row: any = await this.settingsRepo.findOne({
      where: { key: 'platform_settings' },
    });
    if (!row) {
      row = this.settingsRepo.create({
        key: 'platform_settings',
        settings,
        changedBy: actor?.id,
        changedAt: new Date(),
      } as any);
    } else {
      row.settings = settings;
      row.changedBy = actor?.id;
      row.changedAt = new Date();
    }
    const res = await this.settingsRepo.save(row as any);
    await this.recordAction(
      actor,
      'PLATFORM_SETTINGS_UPDATED',
      'platform_settings',
      res.id,
      settings,
    );
    return res;
  }
}
