import { Module } from '@nestjs/common';
import { BookingReleaseScheduler } from './schedulers/booking-release.scheduler';
import { BookingReleaseWorkerService } from './processors/booking-release.processor';
import { TicketPdfWorkerService } from './processors/ticket-pdf.processor';

const workerProviders =
  process.env.WORKERS_ENABLED !== 'false'
    ? [BookingReleaseWorkerService, TicketPdfWorkerService]
    : [];

// Always include TicketPdfWorkerService so it can be exported for other modules
const exportProviders = [TicketPdfWorkerService];

@Module({
  providers: [
    BookingReleaseScheduler,
    ...workerProviders,
    TicketPdfWorkerService,
  ],
  exports: [...exportProviders],
})
export class JobsModule {}
