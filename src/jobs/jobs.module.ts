import { Module } from '@nestjs/common';
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
      ]
    : [];

// Always include TicketPdfWorkerService so it can be exported for other modules
const exportProviders = [TicketPdfWorkerService];

@Module({
  imports: [NotificationsModule, WeatherModule],
  providers: [
    BookingReleaseScheduler,
    StoryExpiryScheduler,
    BookingReminderScheduler,
    PackingReminderScheduler,
    WeatherPrefetchScheduler,
    ...workerProviders,
    TicketPdfWorkerService,
    BookingReminderWorkerService,
    PackingReminderWorkerService,
  ],
  exports: [...exportProviders],
})
export class JobsModule {}
