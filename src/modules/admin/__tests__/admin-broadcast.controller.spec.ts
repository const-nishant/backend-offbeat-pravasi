import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminBroadcastController } from '../admin-broadcast.controller';
import { SegmentType } from '../dtos/admin-broadcast.dto';
import { CampaignStatus } from '../../notifications/enums/campaign-status.enum';

describe('AdminBroadcastController', () => {
  let controller: AdminBroadcastController;
  let service: any;

  const mockActor = { id: 'admin-1', email: 'admin@test.com', isAdmin: true };

  beforeEach(() => {
    service = {
      broadcast: jest.fn<any>().mockResolvedValue({
        jobId: 'bull-job-1',
        campaignId: 'campaign-1',
      }),
      getCampaignHistory: jest.fn<any>().mockResolvedValue({
        data: [
          {
            id: 'campaign-1',
            title: 'Test Campaign',
            status: CampaignStatus.SENT,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    };

    controller = new AdminBroadcastController(service);
  });

  describe('broadcast', () => {
    it('delegates to service with DTO and user', async () => {
      const req = { user: mockActor, ip: '127.0.0.1', headers: {} };
      const dto = {
        title: 'Special offer on Himalayan treks!',
        body: 'Get 20% off on all Himalayan treks booked this month.',
        segment: SegmentType.ALL,
      };

      const result = await controller.broadcast(dto, req);

      expect(service.broadcast).toHaveBeenCalledWith(dto, mockActor);
      expect(result).toEqual({
        jobId: 'bull-job-1',
        campaignId: 'campaign-1',
      });
    });

    it('handles filtered segment DTO with full config', async () => {
      const req = { user: mockActor, ip: '10.0.0.1', headers: {} };
      const dto = {
        title: 'State-specific trek alert!',
        body: 'New treks available in Himachal Pradesh. Check them out now!',
        segment: SegmentType.FILTERED,
        states: ['Himachal Pradesh'],
        trekTagIds: ['tag-1'],
        cities: ['Manali'],
        inactiveDays: 30,
      };

      const result = await controller.broadcast(dto, req);

      expect(service.broadcast).toHaveBeenCalledWith(dto, mockActor);
      expect(result.jobId).toBe('bull-job-1');
    });
  });

  describe('getHistory', () => {
    it('delegates to service with query params', async () => {
      const query = { status: CampaignStatus.SENT, page: 1, limit: 10 };

      const result = await controller.getHistory(query);

      expect(service.getCampaignHistory).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
    });

    it('passes empty query object when no filters', async () => {
      const result = await controller.getHistory({});

      expect(service.getCampaignHistory).toHaveBeenCalledWith({});
      expect(result.pagination.total).toBe(1);
    });
  });
});
