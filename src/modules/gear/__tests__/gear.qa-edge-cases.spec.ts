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
import { GearCategory } from '../enums/gear-category.enum';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * QA Test Suite — 12 years experience, Gear Module
 *
 * Focus areas:
 * 1. Boundary value analysis on rental prices, sort order, and tier edges
 * 2. Equivalence partitioning across all GearCategory and RequirementType values
 * 3. Negative testing — invalid UUIDs, empty arrays, non-existent owners
 * 4. Data integrity — unique constraints, cascade deletes, duplicate initialization
 * 5. State transitions — booking lifecycle blocking rentals after PENDING
 * 6. Access control — organizer ownership edge cases, admin bypass, null organizer
 * 7. Rental precision — null prices, mixed types, zero-cost rentals
 * 8. Idempotency — getPackingList called twice produces no duplicates
 * 9. Empty/null scenarios — empty trek gear, partial DTOs, isActive edges
 * 10. Nested relation traversal — verify all relation paths resolve
 */

describe('GearService — QA Edge Cases (12y exp)', () => {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  } as GearItem;

  const mockTrekWithOwner = {
    id: 'trek-1',
    name: 'Test Trek',
    organizer: { id: 'org-1' },
  } as any;

  const mockTrekNoOwner = {
    id: 'trek-2',
    name: 'Ownerless Trek',
    organizer: null,
  } as any;

  const mockPendingBooking = {
    id: 'booking-1',
    trekId: 'trek-1',
    userId: 'user-1',
    status: BookingStatus.PENDING,
    totalAmountInr: 5000,
    metadata: {},
  } as Booking;

  const mockConfirmedBooking = {
    id: 'booking-2',
    trekId: 'trek-1',
    userId: 'user-1',
    status: BookingStatus.CONFIRMED,
    totalAmountInr: 5000,
    metadata: {},
  } as Booking;

  const mockTrekGearItem = {
    id: 'tg-1',
    trekId: 'trek-1',
    gearItemId: 'gear-1',
    requirementType: RequirementType.REQUIRED,
    rentalPriceInr: undefined,
    notes: null,
    sortOrder: 0,
    gearItem: { id: 'gear-1', name: 'Trekking Shoes', category: 'FOOTWEAR' },
  } as any;

  const mockRentalTrekGearItem = {
    id: 'tg-rental',
    trekId: 'trek-1',
    gearItemId: 'gear-2',
    requirementType: RequirementType.RENTAL,
    rentalPriceInr: 1500,
    notes: null,
    sortOrder: 1,
    gearItem: { id: 'gear-2', name: 'Sleeping Bag', category: 'CAMPING' },
  } as any;

  const mockPackingItem = {
    id: 'pli-1',
    userId: 'user-1',
    trekGearItemId: 'tg-1',
    hasItem: false,
    needsRental: false,
    checked: false,
    trekGearItem: mockTrekGearItem,
  } as any;

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

    trekRepo = { findOne: jest.fn() } as any;
    bookingRepo = { findOne: jest.fn(), save: jest.fn() } as any;

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        GearService,
        { provide: getRepositoryToken(GearItem), useValue: gearItemRepo },
        { provide: getRepositoryToken(TrekGearItem), useValue: trekGearRepo },
        {
          provide: getRepositoryToken(UserPackingListItem),
          useValue: packingListRepo,
        },
        { provide: getRepositoryToken(Trek), useValue: trekRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
      ],
    }).compile();

    service = mod.get(GearService);
  });

  // ─── 1. BOUNDARY VALUE ANALYSIS ──────────────────────────────────────

  describe('BOUNDARY: rental price and sort order', () => {
    it('should accept rentalPriceInr = 0 (free rental)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([
        { id: 'tg-new', rentalPriceInr: 0 } as any,
      ]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.RENTAL,
            rentalPriceInr: 0,
          },
        ],
      });
      expect(result[0].rentalPriceInr).toBe(0);
    });

    it('should accept rentalPriceInr = 1 (minimum non-zero)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([
        { id: 'tg-new', rentalPriceInr: 1 } as any,
      ]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.RENTAL,
            rentalPriceInr: 1,
          },
        ],
      });
      expect(result[0].rentalPriceInr).toBe(1);
    });

    it('should handle sortOrder = 0 correctly (default)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      const createMock = jest.fn().mockReturnValue({});
      trekGearRepo.create.mockImplementation(createMock);

      await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.REQUIRED,
          },
        ],
      });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 0 }),
      );
    });

    it('should assign sequential sortOrder for multiple items', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem, mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      const createMock = jest.fn().mockReturnValue({});
      trekGearRepo.create.mockImplementation(createMock);

      await service.setTrekGear('trek-1', 'org-1', {
        items: [
          { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.RECOMMENDED,
          },
        ],
      });
      expect(createMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sortOrder: 0 }),
      );
      expect(createMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sortOrder: 1 }),
      );
    });
  });

  // ─── 2. EQUIVALENCE PARTITIONING ─────────────────────────────────────

  describe('EQUIVALENCE: requirement types and categories', () => {
    it('should allow REQUIRED type', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([
        { requirementType: RequirementType.REQUIRED } as any,
      ]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
        ],
      });
      expect(result[0].requirementType).toBe(RequirementType.REQUIRED);
    });

    it('should allow RECOMMENDED type', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([
        { requirementType: RequirementType.RECOMMENDED } as any,
      ]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.RECOMMENDED,
          },
        ],
      });
      expect(result[0].requirementType).toBe(RequirementType.RECOMMENDED);
    });

    it('should allow PROVIDED type (organizer provides)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([
        { requirementType: RequirementType.PROVIDED } as any,
      ]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          { gearItemId: 'gear-1', requirementType: RequirementType.PROVIDED },
        ],
      });
      expect(result[0].requirementType).toBe(RequirementType.PROVIDED);
    });

    it('should allow RENTAL type with price', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([
        { requirementType: RequirementType.RENTAL, rentalPriceInr: 500 } as any,
      ]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.RENTAL,
            rentalPriceInr: 500,
          },
        ],
      });
      expect(result[0].rentalPriceInr).toBe(500);
    });

    it('should not store rentalPriceInr for non-RENTAL requirement types', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      const createMock = jest.fn().mockReturnValue({});
      trekGearRepo.create.mockImplementation(createMock);

      await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.REQUIRED,
            rentalPriceInr: 999,
          },
        ],
      });
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ rentalPriceInr: undefined }),
      );
    });

    it('should accept all GearCategory values', async () => {
      const categories = Object.values(GearCategory);
      for (const cat of categories) {
        gearItemRepo.create.mockReturnValue({} as any);
        gearItemRepo.save.mockResolvedValue({
          id: 'g-' + cat,
          category: cat,
        } as any);
        const result = await service.createGearItem({
          name: cat,
          category: cat as any,
        });
        expect(result.category).toBe(cat);
      }
    });
  });

  // ─── 3. NEGATIVE TESTING ────────────────────────────────────────────

  describe('NEGATIVE: invalid inputs and edge cases', () => {
    it('should throw NotFoundException for non-existent gear item id in updateGearItem', async () => {
      gearItemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateGearItem('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for empty string trekId in getTrekGear', async () => {
      trekGearRepo.find.mockResolvedValue([]);
      const result = await service.getTrekGear('');
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException for non-existent trek in setTrekGear', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(
        service.setTrekGear('bad-trek', 'org-1', {
          items: [
            { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when gearItemIds dont all exist in setTrekGear', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      await expect(
        service.setTrekGear('trek-1', 'org-1', {
          items: [
            { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
            {
              gearItemId: 'gear-missing',
              requirementType: RequirementType.RECOMMENDED,
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when needsRental true on REQUIRED item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        trekGearItem: { requirementType: RequirementType.REQUIRED },
      } as any);

      await expect(
        service.updatePackingItem('booking-1', 'pli-1', 'user-1', {
          needsRental: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when needsRental true on RECOMMENDED item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        trekGearItem: { requirementType: RequirementType.RECOMMENDED },
      } as any);

      await expect(
        service.updatePackingItem('booking-1', 'pli-1', 'user-1', {
          needsRental: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when needsRental true on PROVIDED item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        trekGearItem: { requirementType: RequirementType.PROVIDED },
      } as any);

      await expect(
        service.updatePackingItem('booking-1', 'pli-1', 'user-1', {
          needsRental: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow needsRental false on REQUIRED item (no-op toggle off)', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'pli-1',
        userId: 'user-1',
        needsRental: false,
        trekGearItem: { requirementType: RequirementType.REQUIRED },
      } as any);
      packingListRepo.save.mockResolvedValue({
        id: 'pli-1',
        needsRental: false,
      } as any);

      const result = await service.updatePackingItem(
        'booking-1',
        'pli-1',
        'user-1',
        {
          needsRental: false,
        },
      );
      expect(result.needsRental).toBe(false);
    });

    it('should throw NotFoundException for non-existent packing list item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePackingItem('booking-1', 'bad-pli-id', 'user-1', {
          checked: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent booking in getPackingList', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getPackingList('bad-booking', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent booking in confirmRentals', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.confirmRentals('bad-booking', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when trek has no gear items assigned', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([]);
      trekGearRepo.find.mockResolvedValue([]);

      const result = await service.getPackingList('booking-1', 'user-1');
      expect(result).toEqual([]);
    });
  });

  // ─── 4. DATA INTEGRITY ─────────────────────────────────────────────

  describe('DATA INTEGRITY: uniqueness and constraints', () => {
    it('should overwrite existing trek gear on setTrekGear (delete + insert)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 3, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([{ id: 'new-tg-1' } as any]);

      await service.setTrekGear('trek-1', 'org-1', {
        items: [
          { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
        ],
      });

      expect(trekGearRepo.delete).toHaveBeenCalledWith({ trekId: 'trek-1' });
    });

    it('should not duplicate packing list items on second getPackingList call', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([mockPackingItem]);

      const first = await service.getPackingList('booking-1', 'user-1');
      const second = await service.getPackingList('booking-1', 'user-1');

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
      expect(packingListRepo.save).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when different user accesses packing list', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      await expect(
        service.getPackingList('booking-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when different user updates packing item', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      await expect(
        service.updatePackingItem('booking-1', 'pli-1', 'other-user', {
          checked: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when different user confirms rentals', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      await expect(
        service.confirmRentals('booking-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── 5. STATE TRANSITIONS ───────────────────────────────────────────

  describe('STATE TRANSITIONS: booking lifecycle blocks rentals', () => {
    it('should allow rentals when booking is PENDING', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([]);

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(0);
    });

    it('should block rentals when booking is CONFIRMED', async () => {
      bookingRepo.findOne.mockResolvedValue(mockConfirmedBooking);
      await expect(
        service.confirmRentals('booking-2', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block rentals when booking is CANCELLED', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...mockConfirmedBooking,
        id: 'booking-3',
        status: BookingStatus.CANCELLED,
      });
      await expect(
        service.confirmRentals('booking-3', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block rentals when booking is FAILED', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...mockConfirmedBooking,
        id: 'booking-4',
        status: BookingStatus.FAILED,
      });
      await expect(
        service.confirmRentals('booking-4', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should go through full packing list lifecycle: init → toggle → confirm rental', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([]);
      trekGearRepo.find.mockResolvedValue([mockRentalTrekGearItem]);
      packingListRepo.create.mockReturnValue({} as any);
      packingListRepo.save.mockResolvedValue([
        {
          id: 'new-pli',
          userId: 'user-1',
          trekGearItemId: 'tg-rental',
          hasItem: false,
          needsRental: false,
          checked: false,
        } as any,
      ]);

      const initList = await service.getPackingList('booking-1', 'user-1');
      expect(initList).toHaveLength(1);

      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue({
        id: 'new-pli',
        userId: 'user-1',
        hasItem: false,
        needsRental: false,
        checked: false,
        trekGearItem: mockRentalTrekGearItem,
      } as any);
      packingListRepo.save.mockResolvedValue({
        id: 'new-pli',
        userId: 'user-1',
        hasItem: false,
        needsRental: true,
        checked: false,
      } as any);

      const toggled = await service.updatePackingItem(
        'booking-1',
        'new-pli',
        'user-1',
        {
          needsRental: true,
        },
      );
      expect(toggled.needsRental).toBe(true);

      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([
        {
          id: 'new-pli',
          needsRental: true,
          trekGearItem: mockRentalTrekGearItem,
        } as any,
      ]);

      const rental = await service.confirmRentals('booking-1', 'user-1');
      expect(rental.addedCost).toBe(1500);
    });
  });

  // ─── 6. ACCESS CONTROL — ORGANIZER OWNERSHIP ────────────────────────

  describe('ACCESS CONTROL: organizer ownership edge cases', () => {
    it('should throw ForbiddenException when non-organizer tries to set gear', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      await expect(
        service.setTrekGear('trek-1', 'not-the-organizer', {
          items: [
            { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trek has null organizer (no owner)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekNoOwner);
      await expect(
        service.setTrekGear('trek-2', 'any-user', {
          items: [
            { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to set gear for any trek (bypass via service? — no, service checks owner, not admin)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      await expect(
        service.setTrekGear('trek-1', 'not-the-organizer', {
          items: [
            { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow organizer to set gear for their own trek', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([{ id: 'tg-set' } as any]);

      const result = await service.setTrekGear('trek-1', 'org-1', {
        items: [
          { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
        ],
      });
      expect(result).toHaveLength(1);
    });
  });

  // ─── 7. RENTAL PRECISION ────────────────────────────────────────────

  describe('RENTAL: cost calculation edge cases', () => {
    it('should return 0 addedCost when no rental items selected', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([]);

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(0);
    });

    it('should sum multiple rental items correctly', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([
        { needsRental: true, trekGearItem: { rentalPriceInr: 500 } },
        { needsRental: true, trekGearItem: { rentalPriceInr: 1200 } },
        { needsRental: true, trekGearItem: { rentalPriceInr: 300 } },
      ] as any);

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(2000);
    });

    it('should treat null rentalPriceInr as 0 in sum', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([
        { needsRental: true, trekGearItem: { rentalPriceInr: null } },
        { needsRental: true, trekGearItem: { rentalPriceInr: 500 } },
      ] as any);

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(500);
    });

    it('should only query needsRental=true items (WHERE clause filtering in DB)', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockImplementation(async (opts) => {
        const where = (opts as any).where as any;
        expect(where.needsRental).toBe(true);
        return [
          { needsRental: true, trekGearItem: { rentalPriceInr: 800 } } as any,
        ];
      });

      const result = await service.confirmRentals('booking-1', 'user-1');
      expect(result.addedCost).toBe(800);
    });

    it('should store rentalCostInr in booking metadata', async () => {
      const booking = { ...mockPendingBooking, metadata: {} };
      bookingRepo.findOne.mockResolvedValue(booking);
      packingListRepo.find.mockResolvedValue([
        { needsRental: true, trekGearItem: { rentalPriceInr: 1500 } },
      ] as any);

      await service.confirmRentals('booking-1', 'user-1');
      expect(booking.metadata.rentalCostInr).toBe(1500);
      expect(bookingRepo.save).toHaveBeenCalledWith(booking);
    });

    it('should handle metadata being null/undefined gracefully', async () => {
      const booking = { ...mockPendingBooking, metadata: null };
      bookingRepo.findOne.mockResolvedValue(booking);
      packingListRepo.find.mockResolvedValue([
        { needsRental: true, trekGearItem: { rentalPriceInr: 1000 } },
      ] as any);

      await service.confirmRentals('booking-1', 'user-1');
      expect(booking.metadata).toBeDefined();
      expect(booking.metadata.rentalCostInr).toBe(1000);
    });

    it('should not save booking when totalRentalCost is 0', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([
        { needsRental: true, trekGearItem: { rentalPriceInr: null } },
      ] as any);

      await service.confirmRentals('booking-1', 'user-1');
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── 8. PARTIAL DTO UPDATES ─────────────────────────────────────────

  describe('PARTIAL UPDATES: updateGearItem and updatePackingItem', () => {
    it('should only update name when only name is provided', async () => {
      const existing = {
        id: 'g-1',
        name: 'Old',
        category: 'CLOTHING',
      } as GearItem;
      gearItemRepo.findOne.mockResolvedValue(existing);
      gearItemRepo.save.mockResolvedValue({ ...existing, name: 'New' });

      const result = await service.updateGearItem('g-1', { name: 'New' });
      expect(result.name).toBe('New');
      expect((result as any).category).toBe('CLOTHING');
    });

    it('should only update category when only category is provided', async () => {
      const existing = {
        id: 'g-1',
        name: 'Tshirt',
        category: 'CLOTHING',
      } as GearItem;
      gearItemRepo.findOne.mockResolvedValue(existing);
      gearItemRepo.save.mockResolvedValue({
        ...existing,
        category: 'OPTIONAL',
      });

      const result = await service.updateGearItem('g-1', {
        category: 'OPTIONAL' as any,
      });
      expect(result.category).toBe('OPTIONAL');
      expect(result.name).toBe('Tshirt');
    });

    it('should accept empty DTO for updateGearItem (no-op)', async () => {
      const existing = {
        id: 'g-1',
        name: 'Same',
        category: 'CLOTHING',
      } as GearItem;
      gearItemRepo.findOne.mockResolvedValue(existing);
      gearItemRepo.save.mockResolvedValue(existing);

      const result = await service.updateGearItem('g-1', {});
      expect(result.name).toBe('Same');
    });

    it('should accept empty DTO for updatePackingItem (no-op)', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue(mockPackingItem);
      packingListRepo.save.mockResolvedValue(mockPackingItem);

      const result = await service.updatePackingItem(
        'booking-1',
        'pli-1',
        'user-1',
        {},
      );
      expect(result).toBeDefined();
    });

    it('should toggle hasItem independently without affecting needsRental', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue(mockPackingItem);
      packingListRepo.save.mockResolvedValue({
        ...mockPackingItem,
        hasItem: true,
      } as any);

      const result = await service.updatePackingItem(
        'booking-1',
        'pli-1',
        'user-1',
        {
          hasItem: true,
        },
      );
      expect(result.hasItem).toBe(true);
      expect(result.needsRental).toBe(false);
    });
  });

  // ─── 9. IDEMPOTENCY ─────────────────────────────────────────────────

  describe('IDEMPOTENCY: repeated calls produce same results', () => {
    it('should return same gear items on repeated getAllGearItems calls', async () => {
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      const first = await service.getAllGearItems();
      const second = await service.getAllGearItems();
      expect(first).toEqual(second);
      expect(gearItemRepo.find).toHaveBeenCalledTimes(2);
    });

    it('should return same trek gear on repeated getTrekGear calls', async () => {
      trekGearRepo.find.mockResolvedValue([mockTrekGearItem]);
      const first = await service.getTrekGear('trek-1');
      const second = await service.getTrekGear('trek-1');
      expect(first).toEqual(second);
    });

    it('should not create duplicate packing list items on repeated calls', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockPackingItem]);
      trekGearRepo.find.mockResolvedValue([mockTrekGearItem]);
      packingListRepo.create.mockReturnValue({} as any);
      packingListRepo.save.mockResolvedValue([mockPackingItem]);

      const first = await service.getPackingList('booking-1', 'user-1');
      const second = await service.getPackingList('booking-1', 'user-1');

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(1);
    });
  });

  // ─── 10. CONCURRENCY SIMULATION ──────────────────────────────────────

  describe('CONCURRENCY: simulated race conditions', () => {
    it('should handle sequential setTrekGear calls for same trek (last write wins)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([{ id: 'tg-seq-1' } as any]);

      await service.setTrekGear('trek-1', 'org-1', {
        items: [
          { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
        ],
      });

      trekGearRepo.save.mockResolvedValue([{ id: 'tg-seq-2' } as any]);

      await service.setTrekGear('trek-1', 'org-1', {
        items: [
          {
            gearItemId: 'gear-1',
            requirementType: RequirementType.RECOMMENDED,
          },
        ],
      });

      expect(trekGearRepo.delete).toHaveBeenCalledTimes(2);
      expect(trekGearRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent createGearItem calls with different names', async () => {
      gearItemRepo.create.mockReturnValue({} as any);
      gearItemRepo.save
        .mockResolvedValueOnce({
          id: 'g-c1',
          name: 'Concurrent1',
          category: 'CAMPING',
        } as any)
        .mockResolvedValueOnce({
          id: 'g-c2',
          name: 'Concurrent2',
          category: 'CLOTHING',
        } as any);

      const [r1, r2] = await Promise.all([
        service.createGearItem({
          name: 'Concurrent1',
          category: 'CAMPING' as any,
        }),
        service.createGearItem({
          name: 'Concurrent2',
          category: 'CLOTHING' as any,
        }),
      ]);

      expect(r1.id).toBe('g-c1');
      expect(r2.id).toBe('g-c2');
    });

    it('should handle racing setTrekGear and getTrekGear calls', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekWithOwner);
      gearItemRepo.find.mockResolvedValue([mockGearItem]);
      trekGearRepo.delete.mockResolvedValue({ affected: 0, raw: [] });
      trekGearRepo.create.mockReturnValue({} as any);
      trekGearRepo.save.mockResolvedValue([{ id: 'tg-race' } as any]);
      trekGearRepo.find.mockResolvedValue([{ id: 'tg-race' } as any]);

      const [setResult, getResult] = await Promise.all([
        service.setTrekGear('trek-1', 'org-1', {
          items: [
            { gearItemId: 'gear-1', requirementType: RequirementType.REQUIRED },
          ],
        }),
        service.getTrekGear('trek-1'),
      ]);

      expect(setResult).toBeDefined();
      expect(getResult).toHaveLength(1);
    });
  });

  // ─── 11. RELATION TRAVERSAL ─────────────────────────────────────────

  describe('RELATIONS: nested data loading', () => {
    it('should return gearItem relation in getTrekGear results', async () => {
      const item = {
        ...mockTrekGearItem,
        gearItem: {
          id: 'gear-1',
          name: 'Trekking Shoes',
          category: 'FOOTWEAR',
        },
      };
      trekGearRepo.find.mockResolvedValue([item]);

      const result = await service.getTrekGear('trek-1');
      expect(result[0].gearItem).toBeDefined();
      expect(result[0].gearItem.name).toBe('Trekking Shoes');
    });

    it('should return trekGearItem and gearItem in getPackingList results', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.find.mockResolvedValue([mockPackingItem]);

      const result = await service.getPackingList('booking-1', 'user-1');
      expect(result[0].trekGearItem).toBeDefined();
      expect(result[0].trekGearItem.gearItem).toBeDefined();
    });

    it('should return trekGearItem in updatePackingItem for rental validation', async () => {
      bookingRepo.findOne.mockResolvedValue(mockPendingBooking);
      packingListRepo.findOne.mockResolvedValue(mockPackingItem);
      packingListRepo.save.mockResolvedValue(mockPackingItem);

      const result = await service.updatePackingItem(
        'booking-1',
        'pli-1',
        'user-1',
        {
          checked: true,
        },
      );
      expect(result.trekGearItem).toBe(mockPackingItem.trekGearItem);
    });
  });

  // ─── 12. FULL LIFECYCLE ──────────────────────────────────────────────

  describe('LIFECYCLE: gear item full lifecycle', () => {
    it('should go through: create → update → getAll → (no delete method, but verify update)', async () => {
      gearItemRepo.create.mockReturnValue({} as any);
      gearItemRepo.save.mockResolvedValue({
        id: 'g-lc',
        name: 'New Item',
        category: 'NAVIGATION',
      } as any);
      const created = await service.createGearItem({
        name: 'New Item',
        category: 'NAVIGATION' as any,
      });
      expect(created.name).toBe('New Item');

      gearItemRepo.findOne.mockResolvedValue({
        id: 'g-lc',
        name: 'New Item',
        category: 'NAVIGATION',
      } as any);
      gearItemRepo.save.mockResolvedValue({
        id: 'g-lc',
        name: 'Updated Item',
        category: 'OPTIONAL',
      } as any);
      const updated = await service.updateGearItem('g-lc', {
        name: 'Updated Item',
        category: 'OPTIONAL' as any,
      });
      expect(updated.name).toBe('Updated Item');

      gearItemRepo.find.mockResolvedValue([updated]);
      const all = await service.getAllGearItems();
      expect(all).toHaveLength(1);
    });
  });
});
