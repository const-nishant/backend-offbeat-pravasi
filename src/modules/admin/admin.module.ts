import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
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
import { AdminSessionController } from './admin-session.controller';
import { AdminSessionService } from './admin-session.service';
import { AdminActivityController } from './admin-activity.controller';
import { AdminActivityService } from './admin-activity.service';
import { AdminImpersonationController } from './admin-impersonation.controller';
import { AdminImpersonationService } from './admin-impersonation.service';
import { AdminRevenueController } from './admin-revenue.controller';
import { AdminRevenueService } from './admin-revenue.service';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSecurityService } from './admin-security.service';
import { AdminIpFilterController } from './admin-ip-filter.controller';
import { AdminIpFilterService } from './admin-ip-filter.service';
import { AdminOtpController } from './admin-otp.controller';
import { AdminOtpService } from './admin-otp.service';
import { AdminAuditRetentionController } from './admin-audit-retention.controller';
import { AdminAuditRetentionService } from './admin-audit-retention.service';
import { AdminApiKeyController } from './admin-api-key.controller';
import { AdminApiKeyService } from './admin-api-key.service';
import { AdminFeatureFlagController } from './admin-feature-flag.controller';
import { FeatureFlagService } from './feature-flag.service';
import { AdminUserTimelineController } from './admin-user-timeline.controller';
import { AdminUserTimelineService } from './admin-user-timeline.service';
import { WebhookLog } from './entities/webhook-log.entity';
import { AuditLog } from './entities/audit-log.entity';
import { FailedLoginAttempt } from './entities/failed-login-attempt.entity';
import { IpAccessRule } from './entities/ip-access-rule.entity';
import { ApiKey } from './entities/api-key.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
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
      FailedLoginAttempt,
      IpAccessRule,
      ApiKey,
      FeatureFlag,
    ]),
    JwtModule.register({}),
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
    AdminSessionController,
    AdminActivityController,
    AdminImpersonationController,
    AdminRevenueController,
    AdminSecurityController,
    AdminIpFilterController,
    AdminOtpController,
    AdminAuditRetentionController,
    AdminApiKeyController,
    AdminFeatureFlagController,
    AdminUserTimelineController,
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
    AdminSessionService,
    AdminActivityService,
    AdminImpersonationService,
    AdminRevenueService,
    AdminSecurityService,
    AdminIpFilterService,
    AdminOtpService,
    AdminAuditRetentionService,
    AdminApiKeyService,
    FeatureFlagService,
    AdminUserTimelineService,
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService, AuditLogService, FeatureFlagService],
})
export class AdminModule {}
