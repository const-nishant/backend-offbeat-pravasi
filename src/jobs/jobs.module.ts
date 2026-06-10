import { Module } from '@nestjs/common';
import { BookingReleaseScheduler } from './schedulers/booking-release.scheduler';
import { BookingReleaseWorkerService } from './processors/booking-release.processor';
import { TicketPdfWorkerService } from './processors/ticket-pdf.processor';

const workerProviders =
  process.env.WORKERS_ENABLED !== 'false'
    ? [BookingReleaseWorkerService, TicketPdfWorkerService]
    : [];

@Module({
  providers: [BookingReleaseScheduler, ...workerProviders],
  exports: [TicketPdfWorkerService],
})
export class JobsModule {}
