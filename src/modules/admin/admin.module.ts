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
import { AdminCouponController } from './admin-coupon.controller';
import { AdminCouponService } from './admin-coupon.service';
import { AdminReferralTierController } from './admin-referral-tier.controller';
import { AdminReferralTierService } from './admin-referral-tier.service';
import { AdminSearchController } from './admin-search.controller';
import { AdminSearchService } from './admin-search.service';
import { AdminBulkController } from './admin-bulk.controller';
import { AdminBulkService } from './admin-bulk.service';
import { AdminPresetController } from './admin-preset.controller';
import { AdminPresetService } from './admin-preset.service';
import { AdminRateLimitController } from './admin-rate-limit.controller';
import { AdminRateLimitService } from './admin-rate-limit.service';
import { AdminExportController } from './admin-export.controller';
import { AdminExportService } from './admin-export.service';
import { AdminTagController } from './admin-tag.controller';
import { AdminTagService } from './admin-tag.service';
import { AdminStorageController } from './admin-storage.controller';
import { AdminStorageService } from './admin-storage.service';
import { AdminMigrationController } from './admin-migration.controller';
import { AdminMigrationService } from './admin-migration.service';
import { AdminEnvironmentController } from './admin-environment.controller';
import { AdminEnvironmentService } from './admin-environment.service';
import { AdminSafetyController } from './admin-safety.controller';
import { AdminSafetyService } from './admin-safety.service';
import { AdminWeatherAlertController } from './admin-weather-alert.controller';
import { AdminWeatherAlertService } from './admin-weather-alert.service';
import { AdminEmailTemplateController } from './admin-email-template.controller';
import { AdminEmailTemplateService } from './admin-email-template.service';
import { AdminPricingCampaignController } from './admin-pricing-campaign.controller';
import { AdminPricingCampaignService } from './admin-pricing-campaign.service';
import { AdminPayoutController } from './admin-payout.controller';
import { AdminPayoutService } from './admin-payout.service';
import { AdminTaxController } from './admin-tax.controller';
import { AdminTaxService } from './admin-tax.service';
import { AdminCollectionController } from './admin-collection.controller';
import { AdminCollectionService } from './admin-collection.service';
import { AdminBannerController } from './admin-banner.controller';
import { AdminBannerService } from './admin-banner.service';
import { AdminBadgeController } from './admin-badge.controller';
import { AdminBadgeService } from './admin-badge.service';
import { WebhookLog } from './entities/webhook-log.entity';
import { PricingCampaign } from './entities/pricing-campaign.entity';
import { Payout } from './entities/payout.entity';
import { TrekCollection } from './entities/trek-collection.entity';
import { PromotionalBanner } from './entities/promotional-banner.entity';
import { Badge } from './entities/badge.entity';
import { BadgeAward } from './entities/badge-award.entity';
import { WeatherAlert } from './entities/weather-alert.entity';
import { EmailTemplate } from './entities/email-template.entity';
import { AuditLog } from './entities/audit-log.entity';
import { FailedLoginAttempt } from './entities/failed-login-attempt.entity';
import { IpAccessRule } from './entities/ip-access-rule.entity';
import { ApiKey } from './entities/api-key.entity';
import { FeatureFlag } from './entities/feature-flag.entity';
import { Coupon } from './entities/coupon.entity';
import { CouponRedemption } from './entities/coupon-redemption.entity';
import { ReferralTierConfig } from '../referrals/entities/referral-tier-config.entity';
import { PlatformSettingsPreset } from './entities/platform-settings-preset.entity';
import { TrekCategory } from './entities/trek-category.entity';
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
      Coupon,
      CouponRedemption,
      ReferralTierConfig,
      PlatformSettingsPreset,
      TrekCategory,
      WeatherAlert,
      EmailTemplate,
      PricingCampaign,
      Payout,
      TrekCollection,
      PromotionalBanner,
      Badge,
      BadgeAward,
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
    AdminCouponController,
    AdminReferralTierController,
    AdminSearchController,
    AdminBulkController,
    AdminPresetController,
    AdminRateLimitController,
    AdminExportController,
    AdminTagController,
    AdminStorageController,
    AdminMigrationController,
    AdminEnvironmentController,
    AdminSafetyController,
    AdminWeatherAlertController,
    AdminEmailTemplateController,
    AdminPricingCampaignController,
    AdminPayoutController,
    AdminTaxController,
    AdminCollectionController,
    AdminBannerController,
    AdminBadgeController,
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
    AdminCouponService,
    AdminReferralTierService,
    AdminSearchService,
    AdminBulkService,
    AdminPresetService,
    AdminRateLimitService,
    AdminExportService,
    AdminTagService,
    AdminStorageService,
    AdminMigrationService,
    AdminEnvironmentService,
    AdminSafetyService,
    AdminWeatherAlertService,
    AdminEmailTemplateService,
    AdminPricingCampaignService,
    AdminPayoutService,
    AdminTaxService,
    AdminCollectionService,
    AdminBannerService,
    AdminBadgeService,
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService, AuditLogService, FeatureFlagService],
})
export class AdminModule {}
