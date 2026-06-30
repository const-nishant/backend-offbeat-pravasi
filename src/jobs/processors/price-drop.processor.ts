import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { DataSource } from 'typeorm';
import { bullConnection } from '../config';
import { NotificationsService } from '../../modules/notifications/notifications.service';

@Injectable()
export class PriceDropWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PriceDropWorkerService.name);
  private worker!: Worker;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'price-drop-queue',
      async () => {
        await this.checkPriceDrops();
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Price-drop job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Price-drop job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Price-drop worker started');
  }

  async checkPriceDrops(): Promise<{ notified: number }> {
    const rows = await this.dataSource.query(
      `SELECT wi.id, wi."trekId", wi."basePriceInr", wi."collectionId",
              t.name AS "trekName", t."costInr",
              wc."userId"
       FROM wishlist_items wi
       JOIN wishlist_collections wc ON wc.id = wi."collectionId"
       JOIN treks t ON t.id = wi."trekId"
       WHERE wi."basePriceInr" IS NOT NULL
         AND t."costInr" < wi."basePriceInr"`,
    );

    let notified = 0;
    for (const row of rows) {
      const oldPrice = row.basePriceInr;
      const newPrice = row.costInr;

      try {
        await this.notificationsService.notifyWishlistPriceDrop(
          row.userId,
          row.trekName,
          row.trekId,
          oldPrice,
          newPrice,
        );
        await this.dataSource.query(
          `UPDATE wishlist_items SET "basePriceInr" = $1 WHERE id = $2`,
          [newPrice, row.id],
        );
        notified++;
      } catch (err) {
        this.logger.error(
          `Failed to notify price drop for wishlist item ${row.id}`,
          err as any,
        );
      }
    }

    if (notified > 0) {
      this.logger.log(`Sent ${notified} price-drop notifications`);
    }
    return { notified };
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
