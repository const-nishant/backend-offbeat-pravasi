import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { WebhookLog, WebhookStatus } from './entities/webhook-log.entity';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class AdminWebhookService {
  private readonly logger = new Logger(AdminWebhookService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private readonly webhookLogRepo: Repository<WebhookLog>,
    private readonly paymentsService: PaymentsService,
  ) {}

  async list(page = 1, limit = 50, provider?: string, status?: string) {
    const { skip, take } = getPagination({ page, limit }, 10, 200);

    const qb = this.webhookLogRepo
      .createQueryBuilder('w')
      .orderBy('w.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (provider) {
      qb.andWhere('w.provider = :provider', { provider });
    }
    if (status) {
      qb.andWhere('w.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((w) => ({
        id: w.id,
        provider: w.provider,
        eventType: w.eventType,
        status: w.status,
        statusCode: w.statusCode,
        durationMs: w.durationMs,
        retryCount: w.retryCount,
        createdAt: w.createdAt,
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getById(id: string) {
    const log = await this.webhookLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Webhook log not found: ${id}`);
    }
    return log;
  }

  async retry(id: string) {
    const log = await this.webhookLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Webhook log not found: ${id}`);
    }

    const start = Date.now();
    try {
      let result: any;

      if (
        log.eventType === 'payment_intent.succeeded' ||
        log.eventType === 'payment.captured'
      ) {
        const data = this.parseRequestBody(log);
        result = await this.paymentsService.handleProviderSuccess(
          log.provider.toUpperCase() as any,
          data.providerPaymentId || data.orderId,
          data.amount || 0,
        );
      } else if (
        log.eventType === 'payment_intent.payment_failed' ||
        log.eventType === 'payment.failed'
      ) {
        const data = this.parseRequestBody(log);
        result = await this.paymentsService.handleProviderFailure(
          log.provider.toUpperCase() as any,
          data.providerPaymentId || data.orderId,
        );
      } else if (log.eventType === 'charge.refunded') {
        const data = this.parseRequestBody(log);
        result = await this.paymentsService.handleProviderRefund(
          log.provider.toUpperCase() as any,
          data.providerPaymentId,
          data.amount || 0,
        );
      } else {
        throw new Error(`Unsupported event type for retry: ${log.eventType}`);
      }

      const duration = Date.now() - start;

      log.status = WebhookStatus.PROCESSED;
      log.statusCode = 200;
      log.responseBody = JSON.stringify(result);
      log.retryCount += 1;
      log.lastRetryAt = new Date();
      log.durationMs = duration;
      log.error = undefined;
      await this.webhookLogRepo.save(log);

      this.logger.log(`Retried webhook ${id} (${log.eventType}) — success`);

      return { success: true, id, status: 'processed', duration };
    } catch (err: any) {
      const duration = Date.now() - start;

      log.status = WebhookStatus.FAILED;
      log.statusCode = 500;
      log.error = err.message ?? 'Unknown error';
      log.retryCount += 1;
      log.lastRetryAt = new Date();
      log.durationMs = duration;
      await this.webhookLogRepo.save(log);

      this.logger.warn(`Retry failed for webhook ${id}: ${err.message}`);

      return {
        success: false,
        id,
        status: 'failed',
        error: err.message,
        duration,
      };
    }
  }

  private parseRequestBody(log: WebhookLog): Record<string, any> {
    try {
      return JSON.parse(log.requestBody ?? '{}');
    } catch {
      return {};
    }
  }
}
