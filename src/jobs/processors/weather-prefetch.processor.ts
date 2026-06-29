import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';
import { WeatherService } from '../../modules/weather/weather.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '../../modules/notifications/enums/notification-type.enum';

@Injectable()
export class WeatherPrefetchWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WeatherPrefetchWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('weather-prefetch-queue', {
    connection: bullConnection,
  });

  private static readonly SEVERE_CONDITIONS = new Set([
    'storm',
    'heavy_rain',
    'snow',
  ]);

  constructor(
    private readonly dataSource: DataSource,
    private readonly weatherService: WeatherService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'weather-prefetch-queue',
      async (job) => {
        const { trekId, lat, lng, trekName } = job.data as {
          trekId: string;
          lat: number;
          lng: number;
          trekName: string;
        };

        try {
          const weather = await this.weatherService.getForCoordinates(lat, lng);
          this.logger.log(
            `Prefetched weather for trek ${trekName} (${trekId})`,
          );

          const severeDays = weather.days.filter((d) =>
            WeatherPrefetchWorkerService.SEVERE_CONDITIONS.has(d.condition),
          );

          if (severeDays.length > 0) {
            const dates = severeDays.map((d) => d.date).join(', ');
            const message = `Severe weather expected at ${trekName} on ${dates}: ${severeDays[0].condition}. Please check safety guidelines.`;

            const bookingsWithUsers = await this.dataSource.query(
              `SELECT DISTINCT b."userId"
               FROM bookings b
               WHERE b."trekId" = $1
                 AND b.status = 'CONFIRMED'`,
              [trekId],
            );

            for (const row of bookingsWithUsers) {
              try {
                await this.notificationsService.sendPushToUser(
                  row.userId,
                  'Weather Alert',
                  message,
                  NotificationType.BOOKING_REMINDER,
                  { trekId },
                );
              } catch (e) {
                this.logger.error(
                  `Failed to send severe weather alert to user ${row.userId}`,
                  e as any,
                );
              }
            }

            this.logger.log(
              `Severe weather alerts sent for trek ${trekName} (${severeDays.length} days)`,
            );
          }

          return { prefetched: true, trekId, severeDays: severeDays.length };
        } catch (err) {
          this.logger.error(
            `Failed to prefetch weather for trek ${trekId}`,
            err as any,
          );
          throw err;
        }
      },
      { connection: bullConnection, concurrency: 5 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Weather prefetch job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Weather prefetch job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Weather prefetch worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
