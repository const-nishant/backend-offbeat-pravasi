import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminPaymentController } from './admin-payment.controller';
import { AdminPaymentService } from './admin-payment.service';
import { AdminBookingOverrideController } from './admin-booking-override.controller';
import { AdminBookingOverrideService } from './admin-booking-override.service';
import { AdminBroadcastController } from './admin-broadcast.controller';
import { AdminBroadcastService } from './admin-broadcast.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminQueueDashboardController } from './admin-queue-dashboard.controller';
import { AdminQueueDashboardService } from './admin-queue-dashboard.service';
import { AdminCacheController } from './admin-cache.controller';
import { AdminCacheService } from './admin-cache.service';
import { AdminCronController } from './admin-cron.controller';
import { AdminCronService } from './admin-cron.service';
import { AdminDatabaseController } from './admin-database.controller';
import { AdminDatabaseService } from './admin-database.service';
import { AdminWebhookController } from './admin-webhook.controller';
import { AdminWebhookService } from './admin-webhook.service';
import { WebhookLog } from './entities/webhook-log.entity';
import { AuditLog } from './entities/audit-log.entity';
import { PlatformSettingsModule } from './platform-settings.module';
import { User } from '../users/entities/user.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../bookings/entities/payment.entity';
import { OrganizerApplication } from '../organizer/entities/organizer-application.entity';
import { OrganizerModule } from '../organizer/organizer.module';
import { AuditLogService } from './audit-log.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JobsModule } from '../../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationCampaign } from '../notifications/entities/notification-campaign.entity';
import { ReferralCode } from '../referrals/entities/referral-code.entity';
import { Referral } from '../referrals/entities/referral.entity';
import { PaymentsModule } from '../payments/payments.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      Trek,
      Booking,
      Payment,
      OrganizerApplication,
      ReferralCode,
      Referral,
      NotificationCampaign,
      WebhookLog,
    ]),
    PlatformSettingsModule,
    OrganizerModule,
    JobsModule,
    NotificationsModule,
    forwardRef(() => PaymentsModule),
    AnalyticsModule,
  ],
  controllers: [
    AdminController,
    AdminPaymentController,
    AdminBookingOverrideController,
    AdminBroadcastController,
    AdminAnalyticsController,
    AdminQueueDashboardController,
    AdminCacheController,
    AdminCronController,
    AdminDatabaseController,
    AdminWebhookController,
  ],
  providers: [
    AdminService,
    AdminPaymentService,
    AdminBookingOverrideService,
    AdminBroadcastService,
    AdminAnalyticsService,
    AdminQueueDashboardService,
    AdminCacheService,
    AdminCronService,
    AdminDatabaseService,
    AdminWebhookService,
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService, AuditLogService],
})
export class AdminModule {}
