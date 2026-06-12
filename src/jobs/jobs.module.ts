import { Module } from '@nestjs/common';
import { BookingReleaseScheduler } from './schedulers/booking-release.scheduler';
import { BookingReleaseWorkerService } from './processors/booking-release.processor';
import { TicketPdfWorkerService } from './processors/ticket-pdf.processor';
import { StoryExpiryWorkerService } from './processors/stories.processor';
import { StoryExpiryScheduler } from './schedulers/story-expiry.scheduler';

const workerProviders =
  process.env.WORKERS_ENABLED !== 'false'
    ? [
        BookingReleaseWorkerService,
        TicketPdfWorkerService,
        StoryExpiryWorkerService,
      ]
    : [];

// Always include TicketPdfWorkerService so it can be exported for other modules
const exportProviders = [TicketPdfWorkerService];

@Module({
  providers: [
    BookingReleaseScheduler,
    StoryExpiryScheduler,
    ...workerProviders,
    TicketPdfWorkerService,
  ],
  exports: [...exportProviders],
})
export class JobsModule {}
