import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RedisClient } from 'src/common/utils/redis.client';
import { User } from 'src/modules/users/entities/user.entity';
import { OrganizerStatus } from 'src/modules/users/enums/organizer-status.enums';
import { FindOptionsWhere, LessThan, MoreThan, Repository } from 'typeorm';
import { CreateOrganizerRequestDto } from './dtos/create-organizer-request.dto';
import { UpdateOrganizerRequestDto } from './dtos/update-organizer-request.dto';
import { OrganizerTrekFiltersDto } from './dtos/organizer-trek-filters.dto';
import { OrganizerBookingFiltersDto } from './dtos/organizer-booking-filters.dto';
import { OrganizerAnalyticsFiltersDto } from './dtos/organizer-analytics-filters.dto';
import { OrganizerApplication } from './entities/organizer-application.entity';
import { Trek, TrekStatus } from '../treks/entities/trek.entity';
import { TrekReview } from '../treks/entities/trek-review.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import {
  Payment,
  PaymentStatus,
  PaymentProvider,
} from '../bookings/entities/payment.entity';
import {
  getPagination,
  buildPaginationMeta,
} from 'src/common/pagination/pagination.util';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class OrganizerService {
  private readonly logger = new Logger(OrganizerService.name);

  constructor(
    @InjectRepository(OrganizerApplication)
    private readonly applicationRepo: Repository<OrganizerApplication>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailerService: MailerService,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(TrekReview)
    private readonly reviewRepo: Repository<TrekReview>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
  ) {}

  async createApplication(
    userId: string,
    dto: CreateOrganizerRequestDto,
  ): Promise<OrganizerApplication> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existingWhere: FindOptionsWhere<OrganizerApplication> = {
      user: { id: userId },
      status: OrganizerStatus.PENDING,
    };

    const existing = await this.applicationRepo.findOne({
      where: existingWhere,
      relations: ['user'],
    });

    if (existing) {
      throw new ConflictException('An application is already pending');
    }

    const app = this.applicationRepo.create({
      ...(dto as any),
      user,
      status: OrganizerStatus.PENDING,
    });

    const saved = (await this.applicationRepo.save(
      app as any,
    )) as OrganizerApplication;

    user.organizerStatus = OrganizerStatus.PENDING;
    (user as any).isOrganizerActive = false;
    await this.userRepo.save(user);

    try {
      await this.mailerService.sendOrganizerApplicationReceivedEmail(
        user.email,
        user.fullName ?? user.email,
        saved.organizationName,
      );
    } catch {
      // non-blocking
    }

    return saved;
  }

  async updateApplication(
    applicationId: string,
    dto: UpdateOrganizerRequestDto,
  ): Promise<OrganizerApplication> {
    const app = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['user'],
    });

    if (!app) throw new NotFoundException('Application not found');

    if (dto.adminNotes !== undefined) app.adminNotes = dto.adminNotes;
    if (dto.status !== undefined) {
      (app as any).status = dto.status;
    }

    if (dto.reviewedAt !== undefined) {
      app.reviewedAt = new Date(dto.reviewedAt);
    } else if (
      dto.status === OrganizerStatus.APPROVED ||
      dto.status === OrganizerStatus.REJECTED
    ) {
      app.reviewedAt = new Date();
    }

    await this.applicationRepo.save(app);

    const user = app.user;
    if (!user) return app;

    if (dto.status !== undefined) {
      user.organizerStatus = dto.status;
      (user as any).isOrganizerActive = dto.status === OrganizerStatus.APPROVED;
      if (
        dto.status === OrganizerStatus.APPROVED &&
        (user as any).organizerRating == null
      ) {
        (user as any).organizerRating = 0;
      }
      await this.userRepo.save(user);

      try {
        if (dto.status === OrganizerStatus.APPROVED) {
          await this.mailerService.sendOrganizerApprovedEmail(
            user.email,
            user.fullName ?? user.email,
            app.organizationName,
          );
        } else if (dto.status === OrganizerStatus.REJECTED) {
          await this.mailerService.sendOrganizerRejectedEmail(
            user.email,
            user.fullName ?? user.email,
            app.organizationName,
            dto.adminNotes,
          );
        }
      } catch {
        // non-blocking
      }
    }

    return app;
  }

  async getApplicationById(id: string): Promise<OrganizerApplication | null> {
    return this.applicationRepo.findOne({ where: { id }, relations: ['user'] });
  }

  async getMyApplication(userId: string): Promise<OrganizerApplication | null> {
    return this.applicationRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { submittedAt: 'DESC' },
    });
  }

  async getDashboard(userId: string) {
    const cacheKey = `organizer:dashboard:${userId}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore cache miss
    }

    const treks = await this.trekRepo.find({
      where: { organizer: { id: userId } },
    });

    const trekIds = treks.map((t) => t.id);
    const bookings = trekIds.length
      ? await this.bookingRepo.find({
          where: {
            trekId: trekIds.length === 1 ? trekIds[0] : (undefined as any),
          },
        })
      : [];
    const filteredBookings = trekIds.length
      ? await this.bookingRepo
          .createQueryBuilder('b')
          .where('b.trekId IN (:...trekIds)', { trekIds })
          .getMany()
      : [];

    const confirmedBookings = filteredBookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED,
    );
    const pendingBookings = filteredBookings.filter(
      (b) => b.status === BookingStatus.PENDING,
    );

    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + b.totalAmountInr,
      0,
    );
    const totalParticipants = filteredBookings.reduce(
      (sum, b) => sum + b.quantity,
      0,
    );

    const summary = {
      totalTreks: treks.length,
      publishedTreks: treks.filter((t) => t.status === TrekStatus.PUBLISHED)
        .length,
      draftTreks: treks.filter((t) => t.status === TrekStatus.DRAFT).length,
      cancelledTreks: treks.filter((t) => t.status === TrekStatus.CANCELLED)
        .length,
      totalBookings: filteredBookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingBookings: pendingBookings.length,
      totalRevenue,
      totalParticipants,
    };

    const recentBookings = filteredBookings
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const upcomingTreks = treks
      .filter((t) => t.startDate && t.startDate > new Date())
      .sort(
        (a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0),
      )
      .slice(0, 5);

    const lowCapacityTreks = treks.filter(
      (t) =>
        t.maxParticipants > 0 &&
        t.currentParticipants / t.maxParticipants < 0.2,
    );

    const result = {
      summary,
      recentBookings,
      upcomingTreks,
      lowCapacityTreks,
    };

    try {
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
    } catch {
      // ignore cache set failure
    }

    return result;
  }

  async listTreks(userId: string, filters: OrganizerTrekFiltersDto) {
    const { skip, take, page, limit } = getPagination(filters);

    const qb = this.trekRepo
      .createQueryBuilder('t')
      .where('t.organizerId = :userId', { userId });

    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.startDateFrom) {
      qb.andWhere('t.startDate >= :from', { from: filters.startDateFrom });
    }
    if (filters.startDateTo) {
      qb.andWhere('t.startDate <= :to', { to: filters.startDateTo });
    }

    qb.skip(skip).take(take).orderBy('t.createdAt', 'DESC');

    const [treks, total] = await qb.getManyAndCount();

    const treksWithStats = await Promise.all(
      treks.map(async (trek) => {
        const bookings = await this.bookingRepo.find({
          where: { trekId: trek.id },
        });
        const confirmed = bookings.filter(
          (b) => b.status === BookingStatus.CONFIRMED,
        );
        const reviews = await this.reviewRepo.find({
          where: { trek: { id: trek.id } },
        });

        return {
          ...trek,
          stats: {
            totalBookings: bookings.length,
            confirmedBookings: confirmed.length,
            totalParticipants: bookings.reduce((s, b) => s + b.quantity, 0),
            currentCapacity:
              trek.maxParticipants > 0
                ? trek.currentParticipants / trek.maxParticipants
                : 0,
            totalRevenue: confirmed.reduce((s, b) => s + b.totalAmountInr, 0),
            averageRating:
              reviews.length > 0
                ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                : 0,
            reviewsCount: reviews.length,
          },
        };
      }),
    );

    return {
      treks: treksWithStats,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getTrekDetail(trekId: string, userId: string) {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId, organizer: { id: userId } },
      relations: ['organizer'],
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const bookings = await this.bookingRepo.find({
      where: { trekId },
    });

    const reviews = await this.reviewRepo.find({
      where: { trek: { id: trekId } },
      relations: ['user'],
    });

    const confirmed = bookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED,
    );
    const pending = bookings.filter((b) => b.status === BookingStatus.PENDING);
    const cancelled = bookings.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    );

    const confirmedRevenue = confirmed.reduce(
      (s, b) => s + b.totalAmountInr,
      0,
    );

    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1;
    }

    const last7Days = new Date(Date.now() - 7 * 86400000);
    const last30Days = new Date(Date.now() - 30 * 86400000);

    return {
      trek,
      stats: {
        bookings: {
          total: bookings.length,
          confirmed: confirmed.length,
          pending: pending.length,
          cancelled: cancelled.length,
          byStatus: {
            [BookingStatus.PENDING]: pending.length,
            [BookingStatus.CONFIRMED]: confirmed.length,
            [BookingStatus.CANCELLED]: cancelled.length,
            [BookingStatus.FAILED]: bookings.filter(
              (b) => b.status === BookingStatus.FAILED,
            ).length,
          },
        },
        participants: {
          total: bookings.reduce((s, b) => s + b.quantity, 0),
          confirmed: confirmed.reduce((s, b) => s + b.quantity, 0),
          capacityUtilization:
            trek.maxParticipants > 0
              ? (trek.currentParticipants / trek.maxParticipants) * 100
              : 0,
        },
        revenue: {
          total: confirmedRevenue,
          confirmed: confirmedRevenue,
          pending: pending.reduce((s, b) => s + b.totalAmountInr, 0),
          refunded: cancelled.reduce((s, b) => s + b.totalAmountInr, 0),
        },
        reviews: {
          averageRating:
            reviews.length > 0
              ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
              : 0,
          totalCount: reviews.length,
          ratingDistribution: ratingDist,
        },
        trends: {
          bookingsLast7Days: bookings.filter((b) => b.createdAt >= last7Days)
            .length,
          bookingsLast30Days: bookings.filter((b) => b.createdAt >= last30Days)
            .length,
        },
      },
    };
  }

  async updateTrekStatus(trekId: string, status: string, userId: string) {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId, organizer: { id: userId } },
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const newStatus = status as TrekStatus;
    if (!Object.values(TrekStatus).includes(newStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    if (newStatus === TrekStatus.CANCELLED) {
      const confirmedBookings = await this.bookingRepo.count({
        where: { trekId, status: BookingStatus.CONFIRMED },
      });
      if (confirmedBookings > 0) {
        throw new BadRequestException(
          'Cannot cancel trek with confirmed bookings. Contact admin.',
        );
      }
    }

    trek.status = newStatus;
    trek.isPublished = newStatus === TrekStatus.PUBLISHED;

    await this.trekRepo.save(trek);
    return { trek, message: `Trek status updated to ${status}` };
  }

  async getTrekBookings(
    trekId: string,
    userId: string,
    query: OrganizerBookingFiltersDto,
  ) {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId, organizer: { id: userId } },
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const { skip, take, page, limit } = getPagination(query);

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId = :trekId', { trekId });

    if (query.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }

    qb.skip(skip).take(take).orderBy('b.createdAt', 'DESC');

    const [bookings, total] = await qb.getManyAndCount();

    const userIds = [...new Set(bookings.map((b) => b.userId))];
    const users = userIds.length
      ? await this.userRepo
          .createQueryBuilder('u')
          .where('u.id IN (:...ids)', { ids: userIds })
          .getMany()
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedBookings = bookings.map((b) => ({
      ...b,
      user: userMap.get(b.userId)
        ? {
            id: b.userId,
            fullName: (userMap.get(b.userId) as any).fullName ?? null,
            email: (userMap.get(b.userId) as any).email ?? null,
            phone: (userMap.get(b.userId) as any).phone ?? null,
            profileImageUrl:
              (userMap.get(b.userId) as any).profileImageUrl ?? null,
          }
        : null,
    }));

    return {
      bookings: enrichedBookings,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getTrekReviews(trekId: string, userId: string) {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId, organizer: { id: userId } },
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const reviews = await this.reviewRepo.find({
      where: { trek: { id: trekId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1;
    }

    return {
      reviews,
      summary: {
        averageRating:
          reviews.length > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : 0,
        totalCount: reviews.length,
        ratingBreakdown: ratingDist,
      },
    };
  }

  async listBookings(userId: string, filters: OrganizerBookingFiltersDto) {
    const { skip, take, page, limit } = getPagination(filters);

    const trekIds = (
      await this.trekRepo.find({
        where: { organizer: { id: userId } },
        select: ['id'],
      })
    ).map((t) => t.id);

    if (!trekIds.length) {
      return {
        bookings: [],
        pagination: buildPaginationMeta(page, limit, 0),
        summary: { total: 0, byStatus: {}, totalRevenue: 0 },
      };
    }

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId IN (:...trekIds)', { trekIds });

    if (filters.trekId) {
      qb.andWhere('b.trekId = :trekId', { trekId: filters.trekId });
    }
    if (filters.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }

    qb.skip(skip).take(take).orderBy('b.createdAt', 'DESC');

    const [bookings, total] = await qb.getManyAndCount();

    const treks = await this.trekRepo
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', {
        ids: [...new Set(bookings.map((b) => b.trekId))],
      })
      .getMany();
    const trekMap = new Map(treks.map((t) => [t.id, t]));

    const enrichedBookings = bookings.map((b) => ({
      ...b,
      trek: trekMap.get(b.trekId)
        ? {
            id: b.trekId,
            name: trekMap.get(b.trekId)!.name,
            startDate: trekMap.get(b.trekId)!.startDate,
            location: trekMap.get(b.trekId)!.location,
          }
        : null,
    }));

    const confirmed = bookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED,
    );
    const byStatus: Record<string, number> = {};
    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    }

    return {
      bookings: enrichedBookings,
      pagination: buildPaginationMeta(page, limit, total),
      summary: {
        total,
        byStatus,
        totalRevenue: confirmed.reduce((s, b) => s + b.totalAmountInr, 0),
      },
    };
  }

  async getAnalytics(userId: string, filters: OrganizerAnalyticsFiltersDto) {
    const trekIds = (
      await this.trekRepo.find({
        where: { organizer: { id: userId } },
        select: ['id'],
      })
    ).map((t) => t.id);

    if (!trekIds.length) {
      return { period: {}, overview: { totalRevenue: 0, totalBookings: 0 } };
    }

    let qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId IN (:...trekIds)', { trekIds });

    if (filters.startDate) {
      qb = qb.andWhere('b.createdAt >= :start', { start: filters.startDate });
    }
    if (filters.endDate) {
      qb = qb.andWhere('b.createdAt <= :end', { end: filters.endDate });
    }
    if (filters.trekId) {
      qb = qb.andWhere('b.trekId = :tid', { tid: filters.trekId });
    }

    const bookings = await qb.getMany();

    const confirmed = bookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED,
    );
    const pending = bookings.filter((b) => b.status === BookingStatus.PENDING);
    const cancelled = bookings.filter(
      (b) => b.status === BookingStatus.CANCELLED,
    );

    const totalRevenue = confirmed.reduce((s, b) => s + b.totalAmountInr, 0);

    const byStatus: Record<string, number> = {};
    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    }

    const reviews = trekIds.length
      ? await this.reviewRepo
          .createQueryBuilder('r')
          .where('r.trekId IN (:...ids)', { ids: trekIds })
          .getMany()
      : [];

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    return {
      period: {
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
      },
      overview: {
        totalRevenue,
        totalBookings: bookings.length,
        totalParticipants: bookings.reduce((s, b) => s + b.quantity, 0),
        averageBookingValue:
          bookings.length > 0 ? totalRevenue / bookings.length : 0,
        conversionRate: 0,
      },
      revenue: {
        total: totalRevenue,
        confirmed: confirmed.reduce((s, b) => s + b.totalAmountInr, 0),
        pending: pending.reduce((s, b) => s + b.totalAmountInr, 0),
        refunded: cancelled.reduce((s, b) => s + b.totalAmountInr, 0),
      },
      bookings: {
        byStatus,
        total: bookings.length,
        confirmed: confirmed.length,
        pending: pending.length,
        cancelled: cancelled.length,
        failed: bookings.filter((b) => b.status === BookingStatus.FAILED)
          .length,
      },
      reviews: {
        averageRating: avgRating,
        totalCount: reviews.length,
      },
    };
  }

  async getRevenue(userId: string, filters: OrganizerAnalyticsFiltersDto) {
    const trekIds = (
      await this.trekRepo.find({
        where: { organizer: { id: userId } },
        select: ['id'],
      })
    ).map((t) => t.id);

    if (!trekIds.length) {
      return { totalRevenue: 0 };
    }

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId IN (:...trekIds)', { trekIds })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED });

    if (filters.startDate) {
      qb.andWhere('b.createdAt >= :start', { start: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('b.createdAt <= :end', { end: filters.endDate });
    }
    if (filters.trekId) {
      qb.andWhere('b.trekId = :tid', { tid: filters.trekId });
    }

    const bookings = await qb.getMany();
    const totalRevenue = bookings.reduce((s, b) => s + b.totalAmountInr, 0);

    const pendingQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId IN (:...trekIds)', { trekIds })
      .andWhere('b.status = :status', { status: BookingStatus.PENDING });
    const pendingBookings = await pendingQb.getMany();
    const pendingRevenue = pendingBookings.reduce(
      (s, b) => s + b.totalAmountInr,
      0,
    );

    const refundQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId IN (:...trekIds)', { trekIds })
      .andWhere('b.status = :status', { status: BookingStatus.CANCELLED });
    const refundedBookings = await refundQb.getMany();
    const refundedAmount = refundedBookings.reduce(
      (s, b) => s + b.totalAmountInr,
      0,
    );

    const treks = await this.trekRepo
      .createQueryBuilder('t')
      .where('t.id IN (:...ids)', { ids: trekIds })
      .getMany();

    const byTrek = await Promise.all(
      treks.map(async (trek) => {
        const trekBookings = bookings.filter((b) => b.trekId === trek.id);
        return {
          trekId: trek.id,
          trekName: trek.name,
          revenue: trekBookings.reduce((s, b) => s + b.totalAmountInr, 0),
          bookings: trekBookings.length,
        };
      }),
    );

    return {
      totalRevenue,
      confirmedRevenue: totalRevenue,
      pendingRevenue,
      refundedAmount,
      byTrek,
    };
  }

  async getParticipants(userId: string, query: OrganizerBookingFiltersDto) {
    const trekIds = (
      await this.trekRepo.find({
        where: { organizer: { id: userId } },
        select: ['id', 'name'],
      })
    ).map((t) => ({ id: t.id, name: t.name }));

    if (!trekIds.length) {
      return {
        participants: [],
        pagination: buildPaginationMeta(1, 20, 0),
        summary: { totalParticipants: 0 },
      };
    }

    const { skip, take, page, limit } = getPagination(query);
    const trekIdList = trekIds.map((t) => t.id);
    const trekNameMap = new Map(trekIds.map((t) => [t.id, t.name]));

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.trekId IN (:...trekIds)', { trekIds: trekIdList })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
      });

    if (query.trekId) {
      qb.andWhere('b.trekId = :trekId', { trekId: query.trekId });
    }

    qb.skip(skip).take(take).orderBy('b.createdAt', 'DESC');

    const [bookings, total] = await qb.getManyAndCount();

    const userIds = [...new Set(bookings.map((b) => b.userId))];
    const users = userIds.length
      ? await this.userRepo
          .createQueryBuilder('u')
          .where('u.id IN (:...ids)', { ids: userIds })
          .getMany()
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const participants = bookings.map((b) => {
      const user = userMap.get(b.userId);
      return {
        bookingId: b.id,
        trekId: b.trekId,
        trekName: trekNameMap.get(b.trekId) ?? 'Unknown',
        userId: b.userId,
        userName:
          (user as any)?.fullName ?? (user as any)?.username ?? 'Unknown',
        userEmail: (user as any)?.email ?? null,
        userPhone: (user as any)?.phone ?? null,
        participantNames:
          b.participants?.map((p: any) => p.name ?? p).filter(Boolean) ?? [],
        bookingDate: b.createdAt,
        status: b.status,
        amountPaid: b.status === BookingStatus.CONFIRMED ? b.totalAmountInr : 0,
      };
    });

    return {
      participants,
      pagination: buildPaginationMeta(page, limit, total),
      summary: {
        totalParticipants: bookings.reduce((s, b) => s + b.quantity, 0),
        uniqueUsers: userIds.length,
        byTrek: Object.fromEntries(
          trekIds.map((t) => [
            t.name,
            bookings.filter((b) => b.trekId === t.id).length,
          ]),
        ),
      },
    };
  }
}
