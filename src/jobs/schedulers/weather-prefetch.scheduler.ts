import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { weatherPrefetchQueue } from '../queues';
import { CRON_TZ } from '../config';

@Injectable()
export class WeatherPrefetchScheduler implements OnModuleInit {
  private readonly logger = new Logger(WeatherPrefetchScheduler.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await weatherPrefetchQueue.add(
        'prefetch-weather',
        {},
        {
          jobId: 'weather-prefetch-repeater',
          removeOnComplete: true,
          repeat: { every: 3 * 60 * 60 * 1000, tz: CRON_TZ },
        },
      );
      this.logger.log('Weather prefetch scheduler registered (every 3h)');
    } catch (error) {
      this.logger.error('Failed to register weather prefetch scheduler', error);
    }
  }

  async processPrefetch(): Promise<{ prefetched: number; severe: number }> {
    const treks = await this.dataSource.query(
      `SELECT id, latitude, longitude, name
       FROM treks
       WHERE latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND "start_date" BETWEEN now() AND now() + interval '14 days'`,
    );

    let severeCount = 0;

    for (const trek of treks) {
      await weatherPrefetchQueue.add(
        'fetch-and-cache-weather',
        {
          trekId: trek.id,
          lat: trek.latitude,
          lng: trek.longitude,
          trekName: trek.name,
        },
        { removeOnComplete: true, attempts: 2 },
      );

      if (this.isSevereExpected(trek)) {
        severeCount++;
      }
    }

    this.logger.log(
      `Enqueued ${treks.length} weather prefetch jobs (${severeCount} severe)`,
    );
    return { prefetched: treks.length, severe: severeCount };
  }

  private isSevereExpected(_trek: any): boolean {
    return false;
  }
}
