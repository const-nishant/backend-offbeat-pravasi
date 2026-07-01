import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { bullConnection } from '../config';
import { ReferralService } from '../../modules/referrals/referrals.service';

@Injectable()
export class ReferralRewardDeliveryWorkerService {
  private readonly logger = new Logger(ReferralRewardDeliveryWorkerService.name);
  private readonly worker: Worker;

  constructor(private readonly referralService: ReferralService) {
    this.worker = new Worker(
      'referral-reward-delivery-queue',
      async (job) => {
        const { referralId } = job.data;
        await this.referralService.deliverReward(referralId);
      },
      { connection: bullConnection, concurrency: 5 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Referral reward delivery job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Referral reward delivery job ${job?.id} failed: ${err.message}`,
      );
    });
  }
}
