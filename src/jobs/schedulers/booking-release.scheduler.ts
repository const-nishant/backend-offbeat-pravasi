import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { bookingReleaseQueue } from '../queues';
import { CRON_TZ } from '../config';

@Injectable()
export class BookingReleaseScheduler implements OnModuleInit {
  private readonly logger = new Logger(BookingReleaseScheduler.name);

  async onModuleInit(): Promise<void> {
    try {
      await bookingReleaseQueue.add(
        'release-expired',
        {},
        {
          jobId: 'booking-release-repeater',
          removeOnComplete: true,
          repeat: { every: 60 * 1000, tz: CRON_TZ },
        },
      );

      this.logger.log('Booking release scheduler registered (every 60s)');
    } catch (error) {
      this.logger.error('Failed to register booking release scheduler', error);
    }
  }
}
