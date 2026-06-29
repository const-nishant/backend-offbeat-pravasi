import { type Repository } from 'typeorm';
import { ItinerariesService } from './itineraries.service';
import type { ItineraryDay } from './entities/itinerary-day.entity';
import { type Trek } from '../treks/entities/trek.entity';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityType } from './enums/activity-type.enum';
import { AccommodationType } from './enums/accommodation-type.enum';

describe('ItinerariesService', () => {
  let service: ItinerariesService;

  const itineraryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const trekRepo = {
    findOne: jest.fn(),
  };

  const userFixture = { id: 'user-1', email: 'org@test.com' };
  const otherUserFixture = { id: 'user-2', email: 'other@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ItinerariesService(
      itineraryRepo as unknown as Repository<ItineraryDay>,
      trekRepo as unknown as Repository<Trek>,
    );
  });

  describe('getByTrek', () => {
    it('returns days ordered by dayNumber', async () => {
      const days = [
        { id: 'd1', dayNumber: 1, title: 'Day 1' },
        { id: 'd2', dayNumber: 2, title: 'Day 2' },
      ];
      itineraryRepo.find.mockResolvedValue(days);

      const result = await service.getByTrek('trek-1');

      expect(result).toEqual(days);
      expect(itineraryRepo.find).toHaveBeenCalledWith({
        where: { trekId: 'trek-1' },
        order: { dayNumber: 'ASC' },
      });
    });

    it('returns empty array when no days exist', async () => {
      itineraryRepo.find.mockResolvedValue([]);

      const result = await service.getByTrek('trek-1');

      expect(result).toEqual([]);
    });
  });

  describe('addDay', () => {
    const dto = {
      dayNumber: 1,
      title: 'Summit Attempt',
      activityType: ActivityType.TREKKING,
      distanceKm: 8.5,
      accommodationType: AccommodationType.CAMP,
    };

    it('creates a new itinerary day when user owns the trek', async () => {
      trekRepo.findOne.mockResolvedValue({ organizer: userFixture });
      const saved = { id: 'new-day', ...dto, trekId: 'trek-1' };
      itineraryRepo.create.mockReturnValue(saved);
      itineraryRepo.save.mockResolvedValue(saved);

      const result = await service.addDay('trek-1', 'user-1', dto);

      expect(result).toEqual(saved);
      expect(itineraryRepo.create).toHaveBeenCalledWith({
        ...dto,
        trekId: 'trek-1',
      });
    });

    it('throws NotFoundException when trek does not exist', async () => {
      trekRepo.findOne.mockResolvedValue(null);

      await expect(service.addDay('trek-404', 'user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user does not own the trek', async () => {
      trekRepo.findOne.mockResolvedValue({ organizer: otherUserFixture });

      await expect(service.addDay('trek-1', 'user-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('upsertDays', () => {
    const daysDto = [
      { dayNumber: 1, title: 'Day 1', activityType: ActivityType.TREKKING },
      { dayNumber: 2, title: 'Day 2', activityType: ActivityType.REST },
    ];

    it('replaces all days for the trek', async () => {
      trekRepo.findOne.mockResolvedValue({ organizer: userFixture });
      itineraryRepo.delete.mockResolvedValue({ affected: 0 });
      itineraryRepo.create.mockImplementation((d: any) => d);
      itineraryRepo.save.mockResolvedValue(daysDto);

      const result = await service.upsertDays('trek-1', 'user-1', daysDto);

      expect(result).toEqual(daysDto);
      expect(itineraryRepo.delete).toHaveBeenCalledWith({ trekId: 'trek-1' });
      expect(itineraryRepo.create).toHaveBeenCalledTimes(2);
    });

    it('throws when trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);

      await expect(
        service.upsertDays('trek-404', 'user-1', daysDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDay', () => {
    const updateDto = { title: 'Updated Title', distanceKm: 10 };

    it('updates fields on an existing day', async () => {
      const existingDay = {
        id: 'day-1',
        trekId: 'trek-1',
        dayNumber: 1,
        title: 'Old Title',
      };
      itineraryRepo.findOne.mockResolvedValue(existingDay);
      trekRepo.findOne.mockResolvedValue({ organizer: userFixture });
      itineraryRepo.save.mockResolvedValue({
        ...existingDay,
        ...updateDto,
      });

      const result = await service.updateDay('day-1', 'user-1', updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.distanceKm).toBe(10);
    });

    it('throws NotFoundException when day not found', async () => {
      itineraryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateDay('day-404', 'user-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user does not own trek', async () => {
      itineraryRepo.findOne.mockResolvedValue({
        id: 'day-1',
        trekId: 'trek-1',
      });
      trekRepo.findOne.mockResolvedValue({ organizer: otherUserFixture });

      await expect(
        service.updateDay('day-1', 'user-1', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteDay', () => {
    it('removes a day when user owns the trek', async () => {
      const day = { id: 'day-1', trekId: 'trek-1' };
      itineraryRepo.findOne.mockResolvedValue(day);
      trekRepo.findOne.mockResolvedValue({ organizer: userFixture });
      itineraryRepo.remove.mockResolvedValue(day);

      await service.deleteDay('day-1', 'user-1');

      expect(itineraryRepo.remove).toHaveBeenCalledWith(day);
    });

    it('throws NotFoundException when day does not exist', async () => {
      itineraryRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteDay('day-404', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorder', () => {
    it('reassigns dayNumber based on array order', async () => {
      const d1 = { id: 'd1', trekId: 'trek-1', dayNumber: 1 };
      const d2 = { id: 'd2', trekId: 'trek-1', dayNumber: 2 };
      const d3 = { id: 'd3', trekId: 'trek-1', dayNumber: 3 };
      trekRepo.findOne.mockResolvedValue({ organizer: userFixture });
      itineraryRepo.find.mockResolvedValue([d1, d2, d3]);
      itineraryRepo.save.mockResolvedValueOnce([]);
      itineraryRepo.save
        .mockResolvedValueOnce({ ...d3, dayNumber: 1 })
        .mockResolvedValueOnce({ ...d1, dayNumber: 2 })
        .mockResolvedValueOnce({ ...d2, dayNumber: 3 });

      const result = await service.reorder('trek-1', 'user-1', [
        'd3',
        'd1',
        'd2',
      ]);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('d3');
      expect(result[0].dayNumber).toBe(1);
      expect(result[1].id).toBe('d1');
      expect(result[1].dayNumber).toBe(2);
      expect(result[2].id).toBe('d2');
      expect(result[2].dayNumber).toBe(3);
      expect(itineraryRepo.save).toHaveBeenCalledTimes(4);
    });

    it('throws NotFoundException when a day ID is invalid', async () => {
      trekRepo.findOne.mockResolvedValue({ organizer: userFixture });
      itineraryRepo.find.mockResolvedValue([
        { id: 'd1', trekId: 'trek-1', dayNumber: 1 },
      ]);

      await expect(
        service.reorder('trek-1', 'user-1', ['d1', 'nonexistent']),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
