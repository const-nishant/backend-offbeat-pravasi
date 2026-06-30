import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Queue } from 'bullmq';
import { bullConnection } from '../config';
import { SafetyService } from '../../modules/safety/safety.service';

@Injectable()
export class CheckInEmergencyWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CheckInEmergencyWorkerService.name);
  private worker!: Worker;
  private readonly queue = new Queue('checkin-emergency-queue', {
    connection: bullConnection,
  });

  constructor(private readonly safetyService: SafetyService) {}

  async onModuleInit(): Promise<void> {
    this.worker = new Worker(
      'checkin-emergency-queue',
      async (job) => {
        const { checkInId } = job.data as {
          checkInId: string;
          bookingId: string;
          userId: string;
        };

        await this.safetyService.escalateEmergency(checkInId);

        return { checkInId, emergency: true };
      },
      { connection: bullConnection },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Emergency escalation job completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Emergency escalation job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log('Check-in emergency worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
