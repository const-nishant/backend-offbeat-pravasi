import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { GearService } from '../gear.service';
import { GearItem } from '../entities/gear-item.entity';
import { TrekGearItem } from '../entities/trek-gear-item.entity';
import { UserPackingListItem } from '../entities/user-packing-list-item.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { BookingStatus } from '../../bookings/entities/booking.entity';
import { RequirementType } from '../enums/requirement-type.enum';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('GearService', () => {
  let service: GearService;
  let gearItemRepo: jest.Mocked<Repository<GearItem>>;
  let trekGearRepo: jest.Mocked<Repository<TrekGearItem>>;
  let packingListRepo: jest.Mocked<Repository<UserPackingListItem>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;

  const mockGearItem = {
    id: 'gear-1',
    name: 'Trekking Shoes',
    category: 'FOOTWEAR',
    isActive: true,
  } as GearItem;

  const mockTrek = {
    id: 'trek-1',
    name: 'Test Trek',
    organizer: { id: 'organizer-1' },
  } as any;

  const mockBooking = {
    id: 'booking-1',
    trekId: 'trek-1',
    userId: 'user-1',
    status: BookingStatus.PENDING,
    totalAmountInr: 5000,
    metadata: {},
  } as Booking;

  beforeEach(async () => {
    gearItemRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    trekGearRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    packingListRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    trekRepo = {
      findOne: jest.fn(),
    } as any;

    bookingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GearService,
        { provide: getRepositoryToken(GearItem), useValue: gearItemRepo },
        { provide: getRepositoryToken(TrekGearItem), useValue: trekGearRepo },
        { provide: getRepositoryToken(UserPackingListItem), useValue: packingListRepo },
        { provide: getRepositoryToken(Trek), useValue: trekRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
      ],
    }).compile();

    service = module.get(GearService);
  });

  describe('getAllGearItems', () => {
    it('should return all gear items ordered by category and name', async () => {
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      const result = await service.getAllGearItems();
      expect(result).toEqual([mockGearItem]);
      expect(gearItemRepo.find).toHaveBeenCalledWith({
        order: { category: 'ASC', name: 'ASC' },
      });
    });
  });

  describe('createGearItem', () => {
    it('should create and return a gear item', async () => {
      const dto = { name: 'Test Item', category: 'CLOTHING' as any };
      gearItemRepo.create.mockReturnValue(mockGearItem);
      gearItemRepo.save.mockResolvedValue(mockGearItem);

      const result = await service.createGearItem(dto);
      expect(result).toEqual(mockGearItem);
      expect(gearItemRepo.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateGearItem', () => {
    it('should update and return an existing gear item', async () => {
      gearItemRepo.findOne.mockResolvedValue(mockGearItem);
      const updated = { ...mockGearItem, name: 'Updated Shoes' };
      gearItemRepo.save.mockResolvedValue(updated);

      const result = await service.updateGearItem('gear-1', { name: 'Updated Shoes' });
      expect(result.name).toBe('Updated Shoes');
    });

    it('should throw NotFoundException for non-existent item', async () => {
      gearItemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateGearItem('bad-id', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTrekGear', () => {
    it('should return trek gear items with gearItem relation', async () => {
      const trekGearItems = [{ id: 'tg-1', trekId: 'trek-1', gearItem: mockGearItem }] as any;
      trekGearRepo.find.mockResolvedValue(trekGearItems);

      const result = await service.getTrekGear('trek-1');
      expect(result).toEqual(trekGearItems);
      expect(trekGearRepo.find).toHaveBeenCalledWith({
        where: { trekId: 'trek-1' },
        relations: ['gearItem'],
        order: { sortOrder: 'ASC' },
      });
    });
  });

  describe('setTrekGear', () => {
    const dto = {
      items: [
        { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
        { gearItemId: 'gear-2', requirementType: RequirementType.RENTAL, rentalPriceInr: 500 },
      ],
    };

    it('should set gear for a trek owned by the user', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      gearItemRepo.find.mockResolvedValue([mockGearItem, { id: 'gear-2' } as any]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([]);

      await service.setTrekGear('trek-1', 'organizer-1', dto);
      expect(trekGearRepo.delete).toHaveBeenCalledWith({ trekId: 'trek-1' });
    });

    it('should throw NotFoundException when trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(
        service.setTrekGear('bad-id', 'org-1', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not organizer', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      await expect(
        service.setTrekGear('trek-1', 'other-user', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when gear items not found', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      await expect(
        service.setTrekGear('trek-1', 'organizer-1', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPackingList', () => {
    it('should return existing packing list items', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.find.mockResolvedValue([{ id: 'pli-1' } as any]);

      const result = await service.getPackingList('booking-1', 'user-1');
      expect(result).toHaveLength(1);
    });

    it('should create packing list from trek gear when none exists', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.find.mockResolvedValue([]);
      trekGearRepo.find.mockResolvedValue([{ id: 'tg-1' } as any]);
      packingListRepo.create.mockReturnValue({} as any);
      packingListRepo.save.mockResolvedValue([{ id: 'pli-1', trekGearItemId: 'tg-1' } as any]);

      const result = await service.getPackingList('booking-1', 'user-1');
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getPackingList('bad-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      await expect(
        service.getPackingList('booking-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when trek has no gear', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.find.mockResolvedValue([]);
      trekGearRepo.find.mockResolvedValue([]);

      const result = await service.getPackingList('booking-1', 'user-1');
      expect(result).toEqual([]);
    });
  });

  describe('updatePackingItem', () => {
    it('should update hasItem field', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        hasItem: false,
        trekGearItem: { requirementType: RequirementType.REQUIRED },
      } as any);
      packingListRepo.save.mockResolvedValue({ id: 'pli-1', hasItem: true } as any);

      const result = await service.updatePackingItem('booking-1', 'pli-1', 'user-1', { hasItem: true });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when needsRental set on non-rental item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        needsRental: false,
        trekGearItem: { requirementType: RequirementType.REQUIRED },
      } as any);

      await expect(
        service.updatePackingItem('booking-1', 'pli-1', 'user-1', { needsRental: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow needsRental on rental type item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        needsRental: false,
        trekGearItem: { requirementType: RequirementType.RENTAL },
      } as any);
      packingListRepo.save.mockResolvedValue({ id: 'pli-1', needsRental: true } as any);

      const result = await service.updatePackingItem('booking-1', 'pli-1', 'user-1', { needsRental: true });
      expect(result).toBeDefined();
    });
  });

  describe('confirmRentals', () => {
    it('should calculate rental cost and store in metadata', async () => {
      bookingRepo.findOne.mockResolvedValue({ ...mockBooking, metadata: {} });
      packingListRepo.find.mockResolvedValue([
        { needsRental: true, trekGearItem: { rentalPriceInr: 500 } },
        { needsRental: true, trekGearItem: { rentalPriceInr: 300 } },
      ] as any);

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(800);
      expect(bookingRepo.save).toHaveBeenCalled();
    });

    it('should return 0 when no rental items selected', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      packingListRepo.find.mockResolvedValue([]);

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(0);
    });

    it('should throw BadRequestException when booking is not PENDING', async () => {
      bookingRepo.findOne.mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED });
      await expect(
        service.confirmRentals('booking-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
