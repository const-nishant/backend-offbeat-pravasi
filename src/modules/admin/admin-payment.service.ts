import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Payment,
  PaymentStatus,
  PaymentProvider,
} from '../bookings/entities/payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { GatewayRegistry } from '../payments/providers/gateway-registry.service';
import { AuditLogService } from './audit-log.service';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class AdminPaymentService {
  private readonly logger = new Logger(AdminPaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gatewayRegistry: GatewayRegistry,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async searchPayments(filters: any) {
    const qb = this.paymentRepo.createQueryBuilder('p');
    const { skip, take, page, limit } = getPagination(filters, 20, 200);

    if (filters.userId) {
      qb.innerJoin(Booking, 'b', 'b.id = p.bookingId').andWhere(
        'b.userId = :userId',
        { userId: filters.userId },
      );
    }

    if (filters.bookingId) {
      qb.andWhere('p.bookingId = :bookingId', { bookingId: filters.bookingId });
    }
    if (filters.provider) {
      qb.andWhere('p.provider = :provider', { provider: filters.provider });
    }
    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }
    if (filters.startDate) {
      qb.andWhere('p.createdAt >= :start', { start: filters.startDate });
    }
    if (filters.endDate) {
      qb.andWhere('p.createdAt <= :end', { end: filters.endDate });
    }

    qb.orderBy('p.createdAt', 'DESC');
    qb.skip(skip).take(take);
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async refundPayment(
    paymentId: string,
    dto: { amount?: number; reason: string },
    actor: any,
    req?: any,
  ) {
    if (dto.reason.length < 10) {
      throw new BadRequestException(
        'Refund reason must be at least 10 characters',
      );
    }

    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded payments can be refunded');
    }

    const refundAmount = dto.amount ?? payment.amountInr;
    if (refundAmount > payment.amountInr) {
      throw new BadRequestException(
        'Refund amount cannot exceed payment amount',
      );
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });

    return this.dataSource.transaction(async (em) => {
      const paymentRepo = em.getRepository(Payment);
      const bookingRepo = em.getRepository(Booking);

      const latest = await paymentRepo.findOne({
        where: { id: paymentId },
      });
      if (!latest) throw new NotFoundException('Payment not found');

      if (latest.version !== payment.version) {
        throw new ConflictException(
          'Payment was modified by another admin. Please retry.',
        );
      }

      const gateway = this.gatewayRegistry.getGateway(payment.provider);
      let providerRefundId: string | undefined;

      try {
        const result = await gateway.refundPayment(
          payment.providerPaymentId!,
          refundAmount !== payment.amountInr ? refundAmount : undefined,
        );
        providerRefundId = result.providerRefundId;
      } catch (e) {
        this.logger.error(
          `Provider refund failed for payment ${paymentId}`,
          e as any,
        );
        throw new BadRequestException(
          `Refund failed at provider: ${(e as Error).message}`,
        );
      }

      const refundEntry = {
        refundId: randomUUID(),
        amount: refundAmount,
        reason: dto.reason,
        refundedBy: actor.id,
        refundedAt: new Date().toISOString(),
        providerRefundId,
      };

      const refundAudit = [...(latest.refundAudit ?? []), refundEntry];
      const totalRefunded = refundAudit.reduce((s, r) => s + r.amount, 0);
      const isFullRefund = totalRefunded >= latest.amountInr;

      await paymentRepo.update(
        { id: paymentId, version: latest.version },
        {
          status: isFullRefund
            ? PaymentStatus.REFUNDED
            : PaymentStatus.SUCCEEDED,
          refundAudit,
          metadata: {
            ...((latest.metadata ?? {}) as Record<string, unknown>),
            lastRefundedAt: new Date().toISOString(),
            isPartiallyRefunded: !isFullRefund,
          } as any,
        },
      );

      if (isFullRefund && booking) {
        await bookingRepo.update(
          { id: booking.id },
          {
            status: BookingStatus.CANCELLED,
            metadata: {
              ...((booking.metadata ?? {}) as Record<string, unknown>),
              refundReason: dto.reason,
              refundedAt: new Date().toISOString(),
            } as any,
          },
        );
      }

      await this.auditLogService.save({
        actorId: actor.id,
        actorEmail: actor.email
          ? `${String(actor.email).slice(0, 3)}***`
          : null,
        actorRole: 'ADMIN',
        action: isFullRefund ? 'PAYMENT_REFUND' : 'PAYMENT_PARTIAL_REFUND',
        resourceType: 'payment',
        resourceId: paymentId,
        detail: {
          refundAmount,
          reason: dto.reason,
          isFullRefund,
          totalRefunded,
          providerRefundId,
        },
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
        userAgent: req?.headers?.['user-agent'] || undefined,
      });

      const updated = await paymentRepo.findOne({ where: { id: paymentId } });
      return {
        payment: updated,
        booking: isFullRefund
          ? { id: booking?.id, status: BookingStatus.CANCELLED }
          : undefined,
        refundEntry,
      };
    });
  }

  async retryPayment(
    paymentId: string,
    dto: { provider: PaymentProvider; idempotencyKey: string },
    actor: any,
    req?: any,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.FAILED) {
      throw new BadRequestException('Only failed payments can be retried');
    }

    const existing = await this.paymentRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return {
        paymentId: existing.id,
        provider: dto.provider,
        duplicate: true,
        status: existing.status,
      };
    }

    if (dto.provider === payment.provider) {
      throw new BadRequestException(
        'Retry must use a different provider than the original failed payment',
      );
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (!booking) throw new NotFoundException('Associated booking not found');

    const gateway = this.gatewayRegistry.getGateway(dto.provider);
    let intent: { providerPaymentId: string; rawResponse: any };

    try {
      intent = await gateway.createPaymentIntent(
        payment.amountInr,
        dto.idempotencyKey,
      );
    } catch (e) {
      this.logger.error(
        `Provider retry failed for payment ${paymentId}`,
        e as any,
      );
      throw new BadRequestException(
        `Retry failed at provider: ${(e as Error).message}`,
      );
    }

    const retryPayment = this.paymentRepo.create({
      bookingId: payment.bookingId,
      provider: dto.provider,
      amountInr: payment.amountInr,
      currency: 'INR',
      status: PaymentStatus.CREATED,
      providerPaymentId: intent.providerPaymentId,
      providerResponse: intent.rawResponse,
      idempotencyKey: dto.idempotencyKey,
      metadata: {
        retryOf: paymentId,
        originalProvider: payment.provider,
      } as any,
    });
    await this.paymentRepo.save(retryPayment);

    booking.status = BookingStatus.PENDING;
    await this.bookingRepo.save(booking);

    await this.auditLogService.save({
      actorId: actor.id,
      actorEmail: actor.email ? `${String(actor.email).slice(0, 3)}***` : null,
      actorRole: 'ADMIN',
      action: 'PAYMENT_RETRY',
      resourceType: 'payment',
      resourceId: paymentId,
      detail: {
        newPaymentId: retryPayment.id,
        newProvider: dto.provider,
        originalProvider: payment.provider,
      },
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
      userAgent: req?.headers?.['user-agent'] || undefined,
    });

    return {
      paymentId: retryPayment.id,
      provider: dto.provider,
      status: retryPayment.status,
      providerPaymentId: intent.providerPaymentId,
    };
  }

  async getDisputes() {
    const allDisputes: any[] = [];
    const gateways = this.gatewayRegistry.getAllGateways();

    for (const gateway of gateways) {
      try {
        const disputes = await gateway.getDisputes();
        allDisputes.push(...disputes);
      } catch (e) {
        this.logger.error('Failed to fetch disputes from gateway', e as any);
      }
    }

    allDisputes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return { data: allDisputes, total: allDisputes.length };
  }
}
