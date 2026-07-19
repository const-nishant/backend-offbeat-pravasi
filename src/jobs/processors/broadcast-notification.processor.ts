import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Worker, Queue } from 'bullmq';
import { bullConnection } from '../config';
import { NotificationCampaign } from '../../modules/notifications/entities/notification-campaign.entity';
import { User } from '../../modules/users/entities/user.entity';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '../../modules/notifications/enums/notification-type.enum';
import { CampaignStatus } from '../../modules/notifications/enums/campaign-status.enum';

const DEFAULT_BATCH_SIZE = 500;

interface BroadcastJob {
  campaignId: string;
}

@Injectable()
export class BroadcastNotificationWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BroadcastNotificationWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('notification-broadcast-queue', {
    connection: bullConnection,
  });

  constructor(
    @InjectRepository(NotificationCampaign)
    private readonly campaignRepo: Repository<NotificationCampaign>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'notification-broadcast-queue',
      async (job) => {
        const { campaignId } = job.data as BroadcastJob;
        this.logger.log(`Processing broadcast campaign ${campaignId}`);

        const campaign = await this.campaignRepo.findOne({
          where: { id: campaignId },
        });
        if (!campaign) {
          throw new Error(`Campaign ${campaignId} not found`);
        }

        if (campaign.status !== CampaignStatus.PENDING) {
          this.logger.warn(
            `Campaign ${campaignId} is already ${campaign.status}; skipping`,
          );
          return {
            campaignId,
            usersResolved: 0,
            batchesSent: 0,
            skipped: true,
          };
        }

        await this.campaignRepo.update(campaignId, {
          status: CampaignStatus.SENDING,
        });

        const segmentConfig = campaign.segmentConfig as {
          type: string;
          trekTagIds?: string[];
          states?: string[];
          cities?: string[];
          inactiveDays?: number | null;
        };

        const userIds = await this.resolveUserIds(segmentConfig);
        this.logger.log(
          `Campaign ${campaignId}: resolved ${userIds.length} users`,
        );

        if (userIds.length === 0) {
          await this.campaignRepo.update(campaignId, {
            status: CampaignStatus.SENT,
            totalUsers: 0,
            totalBatches: 0,
            completedBatches: 0,
          });
          return { campaignId, usersResolved: 0, batchesSent: 0 };
        }

        const parsedBatchSize = Number(process.env.BROADCAST_BATCH_SIZE);
        const batchSize =
          Number.isFinite(parsedBatchSize) && parsedBatchSize > 0
            ? parsedBatchSize
            : DEFAULT_BATCH_SIZE;
        const batches: string[][] = [];
        for (let i = 0; i < userIds.length; i += batchSize) {
          batches.push(userIds.slice(i, i + batchSize));
        }

        let completedBatches = 0;
        for (const batch of batches) {
          try {
            await this.notificationsService.sendPushToUsers(
              batch,
              campaign.title,
              campaign.body,
              NotificationType.BROADCAST,
              {
                campaignId,
                imageUrl: campaign.imageUrl ?? null,
                deepLink: campaign.deepLink ?? null,
              },
            );
            completedBatches++;
          } catch (err) {
            this.logger.error(
              `Campaign ${campaignId}: batch ${completedBatches + 1} failed`,
              err as Error,
            );
            await this.campaignRepo.update(campaignId, {
              status: CampaignStatus.FAILED,
              error: `Batch ${completedBatches + 1} failed: ${(err as Error).message}`,
              totalUsers: userIds.length,
              totalBatches: batches.length,
              completedBatches,
            });
            throw err;
          }
        }

        await this.campaignRepo.update(campaignId, {
          status: CampaignStatus.SENT,
          totalUsers: userIds.length,
          totalBatches: batches.length,
          completedBatches,
        });

        this.logger.log(
          `Campaign ${campaignId}: sent ${userIds.length} notifications in ${batches.length} batches`,
        );

        return {
          campaignId,
          usersResolved: userIds.length,
          batchesSent: completedBatches,
        };
      },
      {
        connection: bullConnection,
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Broadcast job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Broadcast job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Broadcast notification worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async resolveUserIds(config: {
    type: string;
    trekTagIds?: string[];
    states?: string[];
    cities?: string[];
    inactiveDays?: number | null;
  }): Promise<string[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('DISTINCT u.id')
      .from(User, 'u')
      .where(
        'EXISTS (SELECT 1 FROM device_tokens dt WHERE dt."user_id" = u.id)',
      );

    if (config.type === 'filtered') {
      if (config.trekTagIds && config.trekTagIds.length > 0) {
        qb.andWhere(
          `u.id IN (
            SELECT DISTINCT b."user_id" FROM bookings b
            JOIN treks t ON b."trek_id" = t.id
            JOIN trek_tags_link ttl ON t.id = ttl."trek_id"
            WHERE ttl."tag_id" IN (:...trekTagIds)
          )`,
          { trekTagIds: config.trekTagIds },
        );
      }

      if (config.states && config.states.length > 0) {
        qb.andWhere(
          `u.id IN (
            SELECT DISTINCT b."user_id" FROM bookings b
            JOIN treks t ON b."trek_id" = t.id
            WHERE t.state IN (:...states)
          )`,
          { states: config.states },
        );
      }

      if (config.cities && config.cities.length > 0) {
        const conditions = config.cities.map(
          (_, i) => `u.location ILIKE :city${i}`,
        );
        const params = config.cities.reduce<Record<string, string>>(
          (acc, city, i) => {
            acc[`city${i}`] = `%${city}%`;
            return acc;
          },
          {},
        );
        qb.andWhere(`(${conditions.join(' OR ')})`, params);
      }

      if (config.inactiveDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - config.inactiveDays);
        qb.andWhere(
          `u.id NOT IN (
            SELECT DISTINCT b."user_id" FROM bookings b
            WHERE b."created_at" >= :cutoffDate
          )`,
          { cutoffDate: cutoff },
        );
      }
    }

    const result = await qb.getRawMany<{ id: string }>();
    return result.map((r) => r.id);
  }
}
