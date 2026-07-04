import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingReleaseScheduler } from './schedulers/booking-release.scheduler';
import { BookingReleaseWorkerService } from './processors/booking-release.processor';
import { TicketPdfWorkerService } from './processors/ticket-pdf.processor';
import { StoryExpiryWorkerService } from './processors/stories.processor';
import { StoryExpiryScheduler } from './schedulers/story-expiry.scheduler';
import { BookingReminderWorkerService } from './processors/booking-reminder.processor';
import { BookingReminderScheduler } from './schedulers/booking-reminder.scheduler';
import { NotificationWorkerService } from './processors/notifications.processor';
import { PackingReminderWorkerService } from './processors/packing-reminder.processor';
import { PackingReminderScheduler } from './schedulers/packing-reminder.scheduler';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { WeatherModule } from '../modules/weather/weather.module';
import { WeatherPrefetchScheduler } from './schedulers/weather-prefetch.scheduler';
import { WeatherPrefetchWorkerService } from './processors/weather-prefetch.processor';
import { CheckInFirstWarningWorkerService } from './processors/checkin-first-warning.processor';
import { CheckInEmergencyWorkerService } from './processors/checkin-emergency.processor';
import { SafetyModule } from '../modules/safety/safety.module';
import { GroupsModule } from '../modules/groups/groups.module';
import { GroupExpiryScheduler } from './schedulers/group-expiry.scheduler';
import { GroupExpiryWorkerService } from './processors/group-expiry.processor';
import { ReferralsModule } from '../modules/referrals/referrals.module';
import { ReferralRewardDeliveryWorkerService } from './processors/referral-reward-delivery.processor';
import { RecommendationBuilderWorkerService } from './processors/recommendation-builder.processor';
import { RecommendationBuilderScheduler } from './schedulers/recommendation-builder.scheduler';
import { RecommendationsModule } from '../modules/recommendations/recommendations.module';
import { PriceDropWorkerService } from './processors/price-drop.processor';
import { PriceDropScheduler } from './schedulers/price-drop.scheduler';
import { BroadcastNotificationWorkerService } from './processors/broadcast-notification.processor';
import { NotificationCampaign } from '../modules/notifications/entities/notification-campaign.entity';

const workerProviders =
  process.env.WORKERS_ENABLED !== 'false'
    ? [
        BookingReleaseWorkerService,
        TicketPdfWorkerService,
        StoryExpiryWorkerService,
        BookingReminderWorkerService,
        NotificationWorkerService,
        PackingReminderWorkerService,
        WeatherPrefetchWorkerService,
        CheckInFirstWarningWorkerService,
        CheckInEmergencyWorkerService,
        GroupExpiryWorkerService,
        ReferralRewardDeliveryWorkerService,
        RecommendationBuilderWorkerService,
        PriceDropWorkerService,
        BroadcastNotificationWorkerService,
      ]
    : [];

// Always include TicketPdfWorkerService so it can be exported for other modules
const exportProviders = [TicketPdfWorkerService];

@Module({
  imports: [
    NotificationsModule,
    WeatherModule,
    SafetyModule,
    GroupsModule,
    ReferralsModule,
    RecommendationsModule,
    TypeOrmModule.forFeature([NotificationCampaign]),
  ],
  providers: [
    BookingReleaseScheduler,
    GroupExpiryScheduler,
    RecommendationBuilderScheduler,
    StoryExpiryScheduler,
    BookingReminderScheduler,
    PackingReminderScheduler,
    WeatherPrefetchScheduler,
    PriceDropScheduler,
    ...workerProviders,
    TicketPdfWorkerService,
    BookingReminderWorkerService,
    PackingReminderWorkerService,
  ],
  exports: [...exportProviders],
})
export class JobsModule {}
