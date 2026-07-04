import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminBroadcastService } from '../admin-broadcast.service';
import { SegmentType } from '../dtos/admin-broadcast.dto';
import { CampaignStatus } from '../../notifications/enums/campaign-status.enum';
import { BadRequestException } from '@nestjs/common';

describe('AdminBroadcastService', () => {
  let service: AdminBroadcastService;
  let campaignRepo: any;
  let broadcastQueue: any;

  const mockActor = { id: 'admin-1', email: 'admin@test.com' };

  const validAllDto = {
    title: 'Special offer on Himalayan treks!',
    body: 'Get 20% off on all Himalayan treks booked this month. Limited time offer!',
    segment: SegmentType.ALL,
  };

  const validFilteredDto = {
    title: 'Special offer on Himalayan treks!',
    body: 'Get 20% off on all Himalayan treks booked this month. Limited time offer!',
    segment: SegmentType.FILTERED,
    trekTagIds: ['tag-1', 'tag-2'],
    states: ['Himachal Pradesh'],
    cities: ['Manali'],
    inactiveDays: 90,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    campaignRepo = {
      create: jest.fn<any>(),
      save: jest.fn<any>(),
      createQueryBuilder: jest.fn<any>(),
    };

    broadcastQueue = {
      add: jest.fn<any>(),
    };

    service = new AdminBroadcastService(campaignRepo as any);
    (service as any).broadcastQueue = broadcastQueue;
  });

  describe('broadcast', () => {
    it('throws if filtered segment has no filters', async () => {
      await expect(
        service.broadcast(
          {
            title: 'Valid title here!',
            body: 'Valid body content here for the broadcast message.',
            segment: SegmentType.FILTERED,
          },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates campaign and enqueues job for ALL segment', async () => {
      const createdCampaign = {
        id: 'campaign-1',
        title: validAllDto.title,
        body: validAllDto.body,
        segmentConfig: {
          type: 'all',
          trekTagIds: [],
          states: [],
          cities: [],
          inactiveDays: null,
        },
        status: CampaignStatus.PENDING,
        createdById: mockActor.id,
      };
      campaignRepo.create.mockReturnValue(createdCampaign);
      campaignRepo.save.mockResolvedValue(createdCampaign);
      broadcastQueue.add.mockResolvedValue({ id: 'bull-job-1' });

      const result = await service.broadcast(validAllDto, mockActor);

      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validAllDto.title,
          body: validAllDto.body,
          segmentConfig: expect.objectContaining({ type: 'all' }),
          status: CampaignStatus.PENDING,
          createdById: mockActor.id,
        }),
      );
      expect(campaignRepo.save).toHaveBeenCalledWith(createdCampaign);
      expect(broadcastQueue.add).toHaveBeenCalledWith('broadcast', {
        campaignId: 'campaign-1',
      });
      expect(result).toEqual({
        jobId: 'bull-job-1',
        campaignId: 'campaign-1',
      });
    });

    it('creates campaign and enqueues job for FILTERED segment', async () => {
      const createdCampaign = {
        id: 'campaign-2',
        title: validFilteredDto.title,
        body: validFilteredDto.body,
        segmentConfig: {
          type: 'filtered',
          trekTagIds: ['tag-1', 'tag-2'],
          states: ['Himachal Pradesh'],
          cities: ['Manali'],
          inactiveDays: 90,
        },
        status: CampaignStatus.PENDING,
        createdById: mockActor.id,
      };
      campaignRepo.create.mockReturnValue(createdCampaign);
      campaignRepo.save.mockResolvedValue(createdCampaign);
      broadcastQueue.add.mockResolvedValue({ id: 'bull-job-2' });

      const result = await service.broadcast(validFilteredDto, mockActor);

      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          segmentConfig: expect.objectContaining({
            type: 'filtered',
            trekTagIds: ['tag-1', 'tag-2'],
          }),
        }),
      );
      expect(result.jobId).toBe('bull-job-2');
      expect(result.campaignId).toBe('campaign-2');
    });

    it('handles optional imageUrl and deepLink', async () => {
      const dto = {
        ...validAllDto,
        imageUrl: 'https://example.com/banner.jpg',
        deepLink: 'offbeat://promo/summer',
      };
      campaignRepo.create.mockReturnValue({ id: 'c-3' });
      campaignRepo.save.mockResolvedValue({ id: 'c-3' });
      broadcastQueue.add.mockResolvedValue({ id: 'job-3' });

      await service.broadcast(dto, mockActor);

      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://example.com/banner.jpg',
          deepLink: 'offbeat://promo/summer',
        }),
      );
    });
  });

  describe('getCampaignHistory', () => {
    it('returns paginated campaign list without status filter', async () => {
      const campaigns = [
        { id: 'c-1', title: 'Campaign 1', status: CampaignStatus.SENT },
      ];
      const qb: any = {
        orderBy: jest.fn<any>().mockReturnThis(),
        skip: jest.fn<any>().mockReturnThis(),
        take: jest.fn<any>().mockReturnThis(),
        andWhere: jest.fn<any>().mockReturnThis(),
        getManyAndCount: jest.fn<any>().mockResolvedValue([campaigns, 1]),
      };
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCampaignHistory({ page: 1, limit: 20 });

      expect(qb.orderBy).toHaveBeenCalledWith('c.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result.data).toEqual(campaigns);
      expect(result.pagination.total).toBe(1);
    });

    it('applies status filter when provided', async () => {
      const campaigns = [
        { id: 'c-2', title: 'Failed Campaign', status: CampaignStatus.FAILED },
      ];
      const qb: any = {
        orderBy: jest.fn<any>().mockReturnThis(),
        skip: jest.fn<any>().mockReturnThis(),
        take: jest.fn<any>().mockReturnThis(),
        andWhere: jest.fn<any>().mockReturnThis(),
        getManyAndCount: jest.fn<any>().mockResolvedValue([campaigns, 1]),
      };
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCampaignHistory({
        status: CampaignStatus.FAILED,
        page: 1,
        limit: 10,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('c.status = :status', {
        status: CampaignStatus.FAILED,
      });
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(1);
    });

    it('returns empty list when no campaigns exist', async () => {
      const qb: any = {
        orderBy: jest.fn<any>().mockReturnThis(),
        skip: jest.fn<any>().mockReturnThis(),
        take: jest.fn<any>().mockReturnThis(),
        andWhere: jest.fn<any>().mockReturnThis(),
        getManyAndCount: jest.fn<any>().mockResolvedValue([[], 0]),
      };
      campaignRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCampaignHistory({});

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
