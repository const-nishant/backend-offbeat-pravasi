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

const workerProviders =
  process.env.WORKERS_ENABLED !== 'false'
    ? [
        BookingReleaseWorkerService,
        TicketPdfWorkerService,
        StoryExpiryWorkerService,
        BookingReminderWorkerService,
        NotificationWorkerService,
        PackingReminderWorkerService,
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
    PackingReminderScheduler,
    ...workerProviders,
    TicketPdfWorkerService,
    BookingReminderWorkerService,
    PackingReminderWorkerService,
  ],
  exports: [...exportProviders],
})
export class JobsModule {}
