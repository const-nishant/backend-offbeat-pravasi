import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { ExpoPushProvider } from '../../modules/notifications/providers/expo-push.provider';
import { WebPushProvider } from '../../modules/notifications/providers/web-push.provider';
import { DevicePlatform } from '../../modules/notifications/enums/device-platform.enum';
import { bullConnection } from '../config';

interface PushJob {
  deviceToken: string;
  platform: DevicePlatform;
  title: string;
  body: string;
  data: Record<string, unknown>;
  notificationId: string;
}

@Injectable()
export class NotificationWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('notification-queue', {
    connection: bullConnection,
  });

  constructor(
    private readonly expoProvider: ExpoPushProvider,
    private readonly webPushProvider: WebPushProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'notification-queue',
      async (job) => {
        const data = job.data as PushJob;
        this.logger.debug(
          `Sending push to ${data.platform} device: ${data.notificationId}`,
        );

        const provider =
          data.platform === DevicePlatform.WEB
            ? this.webPushProvider
            : this.expoProvider;

        const result = await provider.send({
          to: data.deviceToken,
          title: data.title,
          body: data.body,
          data: data.data,
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Push send failed');
        }

        return { sent: true, notificationId: data.notificationId };
      },
      {
        connection: bullConnection,
        concurrency: 10,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Push job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Push job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Notification worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
