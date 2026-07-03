import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { bullConnection } from '../../jobs/config';
import { NotificationCampaign } from '../notifications/entities/notification-campaign.entity';
import { CampaignStatus } from '../notifications/enums/campaign-status.enum';
import { AdminBroadcastDto, SegmentType } from './dtos/admin-broadcast.dto';
import { AdminBroadcastHistoryQueryDto } from './dtos/admin-broadcast-history-query.dto';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class AdminBroadcastService {
  private readonly logger = new Logger(AdminBroadcastService.name);
  private readonly broadcastQueue = new Queue('notification-broadcast-queue', {
    connection: bullConnection,
  });

  constructor(
    @InjectRepository(NotificationCampaign)
    private readonly campaignRepo: Repository<NotificationCampaign>,
  ) {}

  async broadcast(
    dto: AdminBroadcastDto,
    actor: { id: string; email?: string },
  ): Promise<{ jobId: string | undefined; campaignId: string }> {
    if (dto.segment === SegmentType.FILTERED) {
      const hasFilter =
        (dto.trekTagIds && dto.trekTagIds.length > 0) ||
        (dto.states && dto.states.length > 0) ||
        (dto.cities && dto.cities.length > 0) ||
        dto.inactiveDays !== undefined;
      if (!hasFilter) {
        throw new BadRequestException(
          'Filtered segment requires at least one filter (tags, states, cities, or inactiveDays)',
        );
      }
    }

    const campaign = this.campaignRepo.create({
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      deepLink: dto.deepLink,
      segmentConfig: {
        type: dto.segment,
        trekTagIds: dto.trekTagIds ?? [],
        states: dto.states ?? [],
        cities: dto.cities ?? [],
        inactiveDays: dto.inactiveDays ?? null,
      },
      status: CampaignStatus.PENDING,
      createdById: actor.id,
    } as unknown as NotificationCampaign);

    const saved = await this.campaignRepo.save(campaign);

    const job = await this.broadcastQueue.add('broadcast', {
      campaignId: saved.id,
    });

    this.logger.log(`Broadcast campaign ${saved.id} enqueued (job ${job.id})`);

    return { jobId: job.id, campaignId: saved.id };
  }

  async getCampaignHistory(query: AdminBroadcastHistoryQueryDto) {
    const { skip, take, page, limit } = getPagination(query, 20, 200);

    const qb = this.campaignRepo
      .createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }
}
