import { Injectable, Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { bullConnection } from '../config';
import { GroupsService } from '../../modules/groups/groups.service';

@Injectable()
export class GroupExpiryWorkerService {
  private readonly logger = new Logger(GroupExpiryWorkerService.name);
  private readonly worker: Worker;

  constructor(private readonly groupsService: GroupsService) {
    this.worker = new Worker(
      'group-expiry-queue',
      async () => {
        await this.groupsService.expireStaleGroups();
      },
      { connection: bullConnection, concurrency: 1 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Group expiry job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Group expiry job ${job?.id} failed: ${err.message}`);
    });
  }
}
