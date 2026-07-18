import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { OrganizerService } from '../organizer/organizer.service';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UpdateOrganizerRequestDto } from '../organizer/dtos/update-organizer-request.dto';
import { PlatformSettingsService } from './platform-settings.service';
import { TicketPdfWorkerService } from '../../jobs/processors/ticket-pdf.processor';
import { NotificationsService } from '../notifications/notifications.service';
import { MailerService } from '../mailer/mailer.service';
import { OrganizerApplication } from '../organizer/entities/organizer-application.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { ReferralCode } from '../referrals/entities/referral-code.entity';
import { Referral } from '../referrals/entities/referral.entity';
import {
  getPagination,
  buildPaginationMeta,
} from 'src/common/pagination/pagination.util';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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
    private readonly notificationsService: NotificationsService,
    private readonly mailerService: MailerService,
    @InjectRepository(ReferralCode)
    private readonly referralCodeRepo: Repository<ReferralCode>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
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

    const orgName = app.organizationName ?? 'your organization';
    if (decisionDto.decision === 'APPROVE') {
      this.notificationsService
        .notifyOrganizerApproved(app.userId, orgName)
        .catch((e) => this.logger.error('Approval push failed', e));
    } else {
      this.notificationsService
        .notifyOrganizerRejected(app.userId, orgName, decisionDto.note)
        .catch((e) => this.logger.error('Rejection push failed', e));
    }

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

    try {
      const organizerName =
        trek.organizer?.fullName ?? trek.organizer?.email ?? 'Organizer';
      const organizerEmail = trek.organizer?.email;
      if (organizerEmail) {
        if (decisionDto.decision === 'APPROVE') {
          await this.mailerService.sendTrekPublishedEmail(organizerEmail, {
            name: organizerName,
            trekName: trek.name,
          });
        } else {
          await this.mailerService.sendTrekRejectedEmail(
            organizerEmail,
            organizerName,
            trek.name,
          );
        }
      }
    } catch (e) {
      this.logger.error('Failed to send trek decision email', e as any);
    }

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
    const qb = this.bookingRepo.createQueryBuilder('b');

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

  async listReferrals(
    filters: any,
    page = 1,
    limit = 20,
  ): Promise<{ data: Referral[]; total: number; page: number; limit: number }> {
    const qb = this.referralRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect(ReferralCode, 'rc', 'rc.id = r.referrerCodeId')
      .leftJoinAndSelect(User, 'u', 'u.id = rc.userId');

    if (filters.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters.referrerId) {
      qb.andWhere('rc.userId = :referrerId', {
        referrerId: filters.referrerId,
      });
    }
    if (filters.startDate) {
      qb.andWhere('r.createdAt >= :start', { start: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('r.createdAt <= :end', { end: filters.endDate });
    }
    if (filters.query) {
      qb.andWhere(
        '(r.refereeEmail ILIKE :q OR u.email ILIKE :q OR u.fullName ILIKE :q)',
        {
          q: `%${filters.query}%`,
        },
      );
    }

    qb.select([
      'r.id',
      'r.referrerCodeId',
      'r.refereeUserId',
      'r.refereeEmail',
      'r.status',
      'r.rewardType',
      'r.rewardValueInr',
      'r.rewardDeliveredAt',
      'r.createdAt',
      'rc.userId',
      'rc.code',
      'rc.tier',
      'u.email',
      'u.fullName',
    ]);
    qb.orderBy('r.createdAt', 'DESC');
    qb.offset((page - 1) * limit).limit(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async listReferralCodes(
    filters: any,
    page = 1,
    limit = 20,
  ): Promise<{
    data: ReferralCode[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.referralCodeRepo
      .createQueryBuilder('rc')
      .leftJoinAndSelect(User, 'u', 'u.id = rc.userId');

    if (filters.tier) {
      qb.andWhere('rc.tier = :tier', { tier: filters.tier });
    }
    if (filters.query) {
      qb.andWhere(
        '(rc.code ILIKE :q OR u.email ILIKE :q OR u.fullName ILIKE :q)',
        {
          q: `%${filters.query}%`,
        },
      );
    }

    qb.select([
      'rc.id',
      'rc.userId',
      'rc.code',
      'rc.tier',
      'rc.totalReferrals',
      'rc.successfulReferrals',
      'rc.totalEarnedInr',
      'rc.createdAt',
      'u.email',
      'u.fullName',
    ]);
    qb.orderBy('rc.createdAt', 'DESC');
    qb.offset((page - 1) * limit).limit(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getReferralSummary(): Promise<{
    totalReferralCodes: number;
    totalReferrals: number;
    successfulReferrals: number;
    totalEarnedInr: number;
    totalRewardedInr: number;
    byTier: { tier: string; count: number; totalEarnedInr: number }[];
    byStatus: Record<string, number>;
    topReferrers: {
      userId: string;
      name: string;
      email: string;
      successfulReferrals: number;
      totalEarnedInr: number;
    }[];
  }> {
    const totalReferralCodes = await this.referralCodeRepo.count();
    const totalReferrals = await this.referralRepo.count();
    const successfulReferrals = await this.referralRepo.count({
      where: { status: 'REWARDED' as any },
    });

    const allCodes = await this.referralCodeRepo.find();
    const totalEarnedInr = allCodes.reduce((s, c) => s + c.totalEarnedInr, 0);

    const rewarded = await this.referralRepo.find({
      where: { status: 'REWARDED' as any },
    });
    const totalRewardedInr = rewarded.reduce(
      (s, r) => s + (r.rewardValueInr ?? 0),
      0,
    );

    const byTierRaw = await this.referralCodeRepo
      .createQueryBuilder('rc')
      .select('rc.tier', 'tier')
      .addSelect('COUNT(rc.id)', 'count')
      .addSelect('SUM(rc.totalEarnedInr)', 'totalEarnedInr')
      .groupBy('rc.tier')
      .getRawMany();

    const byTier = byTierRaw.map((r: any) => ({
      tier: r.tier,
      count: Number(r.count),
      totalEarnedInr: Number(r.totalEarnedInr ?? 0),
    }));

    const byStatusRaw = await this.referralRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(r.id)', 'count')
      .groupBy('r.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const r of byStatusRaw) {
      byStatus[r.status] = Number(r.count);
    }

    const topCodes = await this.referralCodeRepo.find({
      order: { successfulReferrals: 'DESC' },
      take: 10,
    });

    const userIds = topCodes.map((c) => c.userId);
    const users =
      userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topReferrers = topCodes.map((c) => {
      const u = userMap.get(c.userId);
      return {
        userId: c.userId,
        name: u?.fullName ?? 'Unknown',
        email: u?.email ?? '',
        successfulReferrals: c.successfulReferrals,
        totalEarnedInr: c.totalEarnedInr,
      };
    });

    return {
      totalReferralCodes,
      totalReferrals,
      successfulReferrals,
      totalEarnedInr,
      totalRewardedInr,
      byTier,
      byStatus,
      topReferrers,
    };
  }
}
