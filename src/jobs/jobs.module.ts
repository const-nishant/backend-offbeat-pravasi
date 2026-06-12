import { Module } from '@nestjs/common';
import { BookingReleaseScheduler } from './schedulers/booking-release.scheduler';
import { BookingReleaseWorkerService } from './processors/booking-release.processor';
import { TicketPdfWorkerService } from './processors/ticket-pdf.processor';
import { StoryExpiryWorkerService } from './processors/stories.processor';
import { StoryExpiryScheduler } from './schedulers/story-expiry.scheduler';
import { BookingReminderWorkerService } from './processors/booking-reminder.processor';
import { BookingReminderScheduler } from './schedulers/booking-reminder.scheduler';
import { NotificationWorkerService } from './processors/notifications.processor';
import { NotificationsModule } from '../modules/notifications/notifications.module';

const workerProviders =
  process.env.WORKERS_ENABLED !== 'false'
    ? [
        BookingReleaseWorkerService,
        TicketPdfWorkerService,
        StoryExpiryWorkerService,
        BookingReminderWorkerService,
        NotificationWorkerService,
      ]
    : [];

// Always include TicketPdfWorkerService so it can be exported for other modules
const exportProviders = [TicketPdfWorkerService];

@Module({
  imports: [NotificationsModule],
  providers: [
    BookingReleaseScheduler,
    StoryExpiryScheduler,
    BookingReminderScheduler,
    ...workerProviders,
    TicketPdfWorkerService,
    BookingReminderWorkerService,
  ],
  exports: [...exportProviders],
})
export class JobsModule {}
