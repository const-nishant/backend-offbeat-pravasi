import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from './entities/analytics-event.entity';

export const AnalyticsEvents = {
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  TREK_VIEW: 'TREK_VIEW',
  BOOKING_CREATED: 'BOOKING_CREATED',
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
} as const;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly eventRepo: Repository<AnalyticsEvent>,
  ) {}

  async track(
    userId: string,
    event: string,
    properties?: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const entry = this.eventRepo.create({
        userId,
        event,
        properties: properties ?? undefined,
        ipAddress: ipAddress ?? undefined,
      });
      await this.eventRepo.save(entry);
    } catch (err) {
      this.logger.error(
        `Failed to track event ${event} for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
