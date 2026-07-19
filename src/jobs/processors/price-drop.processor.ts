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
export class PriceDropWorkerService implements OnModuleInit, OnModuleDestroy {
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
      `SELECT wi.id, wi."trek_id" as "trekId", wi."base_price_inr" as "basePriceInr", wi."collection_id" as "collectionId",
              t.name AS "trekName", t."cost_inr" as "costInr",
              wc."user_id" as "userId"
       FROM wishlist_items wi
       JOIN wishlist_collections wc ON wc.id = wi."collection_id"
       JOIN treks t ON t.id = wi."trek_id"
       WHERE wi."base_price_inr" IS NOT NULL
         AND t."cost_inr" < wi."base_price_inr"`,
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
          `UPDATE wishlist_items SET "base_price_inr" = $1 WHERE id = $2`,
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
