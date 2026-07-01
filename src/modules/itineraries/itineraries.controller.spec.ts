import { Test } from '@nestjs/testing';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesService } from './itineraries.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ActivityType } from './enums/activity-type.enum';

describe('ItinerariesController', () => {
  let controller: ItinerariesController;
  const itinerariesService = {
    getByTrek: jest.fn(),
    addDay: jest.fn(),
    upsertDays: jest.fn(),
    updateDay: jest.fn(),
    deleteDay: jest.fn(),
    reorder: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'org@test.com',
    isAdmin: false,
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItinerariesController],
      providers: [
        { provide: ItinerariesService, useValue: itinerariesService },
      ],
    }).compile();

    controller = moduleRef.get(ItinerariesController);
    jest.clearAllMocks();
  });

  describe('GET /treks/:trekId/itinerary', () => {
    it('returns itinerary days', async () => {
      const days = [{ id: 'd1', dayNumber: 1, title: 'Day 1' }];
      itinerariesService.getByTrek.mockResolvedValue(days);

      const result = await controller.getByTrek('trek-1');

      expect(result).toEqual(days);
      expect(itinerariesService.getByTrek).toHaveBeenCalledWith('trek-1');
    });
  });

  describe('PUT /treks/:trekId/itinerary', () => {
    it('replaces all itinerary days', async () => {
      const dto = [
        { dayNumber: 1, title: 'Day 1', activityType: ActivityType.TREKKING },
      ];
      itinerariesService.upsertDays.mockResolvedValue(dto);

      const result = await controller.upsertDays(
        'trek-1',
        mockUser,
        dto as any,
      );

      expect(result).toEqual(dto);
      expect(itinerariesService.upsertDays).toHaveBeenCalledWith(
        'trek-1',
        'user-1',
        dto,
      );
    });
  });

  describe('POST /treks/:trekId/itinerary/days', () => {
    it('adds a single day', async () => {
      const dto = {
        dayNumber: 1,
        title: 'Summit',
        activityType: ActivityType.TREKKING,
      };
      const saved = { id: 'd1', ...dto };
      itinerariesService.addDay.mockResolvedValue(saved);

      const result = await controller.addDay('trek-1', mockUser, dto as any);

      expect(result).toEqual(saved);
      expect(itinerariesService.addDay).toHaveBeenCalledWith(
        'trek-1',
        'user-1',
        dto,
      );
    });
  });

  describe('PATCH /treks/:trekId/itinerary/days/:dayId', () => {
    it('updates a day', async () => {
      const dto = { title: 'Updated' };
      const updated = { id: 'd1', title: 'Updated' };
      itinerariesService.updateDay.mockResolvedValue(updated);

      const result = await controller.updateDay('d1', mockUser, dto as any);

      expect(result).toEqual(updated);
      expect(itinerariesService.updateDay).toHaveBeenCalledWith(
        'd1',
        'user-1',
        dto,
      );
    });
  });

  describe('DELETE /treks/:trekId/itinerary/days/:dayId', () => {
    it('deletes a day', async () => {
      itinerariesService.deleteDay.mockResolvedValue(undefined);

      const result = await controller.deleteDay('d1', mockUser);

      expect(result).toBeUndefined();
      expect(itinerariesService.deleteDay).toHaveBeenCalledWith('d1', 'user-1');
    });
  });

  describe('PATCH /treks/:trekId/itinerary/reorder', () => {
    it('reorders days', async () => {
      const dto = { dayIds: ['d3', 'd1', 'd2'] };
      const reordered = [
        { id: 'd3', dayNumber: 1 },
        { id: 'd1', dayNumber: 2 },
        { id: 'd2', dayNumber: 3 },
      ];
      itinerariesService.reorder.mockResolvedValue(reordered);

      const result = await controller.reorder('trek-1', mockUser, dto as any);

      expect(result).toEqual(reordered);
      expect(itinerariesService.reorder).toHaveBeenCalledWith(
        'trek-1',
        'user-1',
        ['d3', 'd1', 'd2'],
      );
    });
  });
});
