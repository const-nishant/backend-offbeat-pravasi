import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OrganizerService } from '../organizer/organizer.service';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UpdateOrganizerRequestDto } from '../organizer/dtos/update-organizer-request.dto';
import { PlatformSettingsService } from './platform-settings.service';
import { TicketPdfWorkerService } from '../../jobs/processors/ticket-pdf.processor';
import { OrganizerApplication } from '../organizer/entities/organizer-application.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import {
  getPagination,
  buildPaginationMeta,
} from 'src/common/pagination/pagination.util';

@Injectable()
export class AdminService {
  constructor(
    private readonly auditLogService: AuditLogService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizerApplication)
    private readonly appRepo: Repository<OrganizerApplication>,
    @InjectRepository(Trek) private readonly trekRepo: Repository<Trek>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly organizerService: OrganizerService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly ticketPdfWorker: TicketPdfWorkerService,
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
    if (dto.isSuspended !== undefined)
      (user as any).isSuspended = dto.isSuspended;
    if (dto.organizerStatus !== undefined)
      user.organizerStatus = dto.organizerStatus as any;
    await this.userRepo.save(user);
    await this.recordAction(actor, 'USER_STATUS_UPDATED', 'user', id, dto, req);
    return user;
  }

  async listOrganizerRequests(filters: any, page = 1, limit = 20) {
    const qb = this.appRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u');

    if (filters.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    }
    if (filters.query) {
      qb.andWhere('(u.email ILIKE :q OR a.organizationName ILIKE :q)', {
        q: `%${filters.query}%`,
      });
    }

    qb.orderBy('a.submittedAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
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

  async listPendingTreks(filters: any, page = 1, limit = 20) {
    const qb = this.trekRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.organizer', 'o')
      .where('t.isPublished = :pub', { pub: false });

    if (filters.query) {
      qb.andWhere('(t.name ILIKE :q OR t.location ILIKE :q)', {
        q: `%${filters.query}%`,
      });
    }

    qb.orderBy('t.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async decideTrek(
    id: string,
    decisionDto: { decision: 'APPROVE' | 'REJECT' },
    actor?: any,
    req?: any,
  ) {
    const trek = await this.trekRepo.findOne({ where: { id } });
    if (!trek) throw new NotFoundException('Trek not found');

    if (decisionDto.decision === 'APPROVE') {
      trek.isPublished = true;
    } else {
      trek.isPublished = false;
    }

    await this.trekRepo.save(trek);
    await this.recordAction(
      actor,
      'TREK_DECISION',
      'trek',
      id,
      decisionDto,
      req,
    );
    return trek;
  }

  async getBookingsReport(filters: any, page = 1, limit = 20) {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.trek', 't');

    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.startDate) {
      qb.andWhere('b.createdAt >= :start', { start: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('b.createdAt <= :end', { end: filters.endDate });
    }

    qb.orderBy('b.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();

    const allBookings = await this.bookingRepo.find();
    const confirmed = allBookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED,
    );
    const totalRevenue = confirmed.reduce((s, b) => s + b.totalAmountInr, 0);
    const byStatus: Record<string, number> = {};
    for (const b of allBookings) {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    }

    return {
      data,
      total,
      page,
      limit,
      summary: {
        totalBookings: allBookings.length,
        totalRevenue,
        byStatus,
        confirmedBookings: confirmed.length,
      },
    };
  }

  async enqueueTicketPdfJob(bookingId: string, actor?: any) {
    const result = await this.ticketPdfWorker.enqueuePdfJob(bookingId);
    await this.recordAction(actor, 'ENQUEUE_TICKET_PDF', 'booking', bookingId, {
      jobId: result.jobId,
    });
    return result;
  }

  async getPlatformSettings() {
    return this.platformSettingsService.getSettings();
  }

  async updatePlatformSettings(settings: any, actor: any) {
    const res = await this.platformSettingsService.updateSettings(
      settings,
      actor,
    );
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
