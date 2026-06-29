import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { PoliciesService } from '../policies.service';
import { CancellationPolicy } from '../entities/cancellation-policy.entity';
import { CancellationTier } from '../entities/cancellation-tier.entity';
import { TrekPolicy } from '../entities/trek-policy.entity';
import { BookingPolicySnapshot } from '../entities/booking-policy-snapshot.entity';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let policyRepo: jest.Mocked<Repository<CancellationPolicy>>;
  let tierRepo: jest.Mocked<Repository<CancellationTier>>;
  let trekPolicyRepo: jest.Mocked<Repository<TrekPolicy>>;
  let snapshotRepo: jest.Mocked<Repository<BookingPolicySnapshot>>;

  const mockPolicy = {
    id: 'policy-1',
    name: 'Standard',
    description: 'Standard cancellation policy',
    isDefault: true,
    tiers: [
      {
        id: 'tier-1',
        policyId: 'policy-1',
        fromHoursBeforeStart: 168,
        toHoursBeforeStart: null,
        refundPercentage: 100,
        sortOrder: 1,
      },
      {
        id: 'tier-2',
        policyId: 'policy-1',
        fromHoursBeforeStart: 72,
        toHoursBeforeStart: 167,
        refundPercentage: 50,
        sortOrder: 2,
      },
      {
        id: 'tier-3',
        policyId: 'policy-1',
        fromHoursBeforeStart: 0,
        toHoursBeforeStart: 71,
        refundPercentage: 0,
        sortOrder: 3,
      },
    ],
  } as any;

  beforeEach(async () => {
    policyRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    } as any;

    tierRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
    } as any;

    trekPolicyRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    snapshotRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        {
          provide: getRepositoryToken(CancellationPolicy),
          useValue: policyRepo,
        },
        { provide: getRepositoryToken(CancellationTier), useValue: tierRepo },
        { provide: getRepositoryToken(TrekPolicy), useValue: trekPolicyRepo },
        {
          provide: getRepositoryToken(BookingPolicySnapshot),
          useValue: snapshotRepo,
        },
      ],
    }).compile();

    service = module.get(PoliciesService);
  });

  describe('findAll', () => {
    it('should return all policies ordered by createdAt desc', async () => {
      policyRepo.find.mockResolvedValue([mockPolicy]);
      const result = await service.findAll();
      expect(result).toEqual([mockPolicy]);
      expect(policyRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a policy by id', async () => {
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      const result = await service.findOne('policy-1');
      expect(result).toEqual(mockPolicy);
    });

    it('should throw NotFoundException for non-existent policy', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDefault', () => {
    it('should return the default policy', async () => {
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      const result = await service.getDefault();
      expect(result).toEqual(mockPolicy);
      expect(policyRepo.findOne).toHaveBeenCalledWith({
        where: { isDefault: true },
      });
    });

    it('should throw NotFoundException when no default exists', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.getDefault()).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      name: 'Flexible',
      description: 'Flexible policy',
      isDefault: true,
      tiers: [
        {
          fromHoursBeforeStart: 48,
          toHoursBeforeStart: undefined,
          refundPercentage: 100,
          sortOrder: 1,
        },
        {
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 47,
          refundPercentage: 0,
          sortOrder: 2,
        },
      ],
    };

    const savedPolicy = {
      id: 'new-policy',
      name: 'Flexible',
      description: 'Flexible policy',
      isDefault: true,
      tiers: [
        {
          id: 'tier-1',
          policyId: 'new-policy',
          fromHoursBeforeStart: 48,
          refundPercentage: 100,
          sortOrder: 1,
        },
        {
          id: 'tier-2',
          policyId: 'new-policy',
          fromHoursBeforeStart: 0,
          toHoursBeforeStart: 47,
          refundPercentage: 0,
          sortOrder: 2,
        },
      ],
    } as any;

    it('should create a policy with tiers', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      policyRepo.create.mockReturnValue({
        id: 'new-policy',
        name: 'Flexible',
        description: 'Flexible policy',
        isDefault: true,
      } as any);
      policyRepo.save.mockResolvedValue({
        id: 'new-policy',
        name: 'Flexible',
        isDefault: true,
      } as any);
      tierRepo.save.mockResolvedValue([]);

      policyRepo.findOne.mockResolvedValueOnce(savedPolicy);

      const result = await service.create(dto);

      expect(policyRepo.create).toHaveBeenCalledWith({
        name: 'Flexible',
        description: 'Flexible policy',
        isDefault: true,
      });
      expect(result.tiers).toHaveLength(2);
    });

    it('should clear existing default when new one is set', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      policyRepo.create.mockReturnValue({ id: 'new-policy' } as any);
      policyRepo.save.mockResolvedValue({
        id: 'new-policy',
        name: 'Flexible',
        isDefault: true,
      } as any);
      tierRepo.save.mockResolvedValue([]);
      policyRepo.findOne.mockResolvedValueOnce(savedPolicy);

      await service.create(dto);

      expect(policyRepo.update).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false },
      );
    });
  });

  describe('getForTrek', () => {
    it('should return assigned policy when trek has explicit policy', async () => {
      trekPolicyRepo.findOne.mockResolvedValue({
        policyId: 'policy-1',
        policy: mockPolicy,
      } as any);
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      const result = await service.getForTrek('trek-1');
      expect(result).toEqual(mockPolicy);
      expect(policyRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'policy-1' },
      });
    });

    it('should return default when trek has no explicit policy', async () => {
      trekPolicyRepo.findOne.mockResolvedValue(null);
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      const result = await service.getForTrek('trek-1');
      expect(result).toEqual(mockPolicy);
    });
  });

  describe('assignToTrek', () => {
    it('should create new link when none exists', async () => {
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      trekPolicyRepo.findOne.mockResolvedValue(null);
      trekPolicyRepo.create.mockReturnValue({
        trekId: 'trek-1',
        policyId: 'policy-1',
      } as any);

      await service.assignToTrek('trek-1', 'policy-1');

      expect(trekPolicyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ trekId: 'trek-1', policyId: 'policy-1' }),
      );
    });

    it('should update existing link', async () => {
      const existingLink = { trekId: 'trek-1', policyId: 'old-policy' } as any;
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      trekPolicyRepo.findOne.mockResolvedValue(existingLink);

      await service.assignToTrek('trek-1', 'policy-1');

      expect(existingLink.policyId).toBe('policy-1');
      expect(trekPolicyRepo.save).toHaveBeenCalledWith(existingLink);
    });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot from the current trek policy', async () => {
      trekPolicyRepo.findOne.mockResolvedValue({
        policyId: 'policy-1',
        policy: mockPolicy,
      } as any);
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      snapshotRepo.create.mockReturnValue({} as any);
      snapshotRepo.save.mockResolvedValue({} as any);

      await service.createSnapshot('booking-1', 'trek-1');

      expect(snapshotRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-1',
          policyName: 'Standard',
        }),
      );
      expect(snapshotRepo.save).toHaveBeenCalled();
    });
  });

  describe('calculateRefund', () => {
    const futureDate = new Date(Date.now() + 86400000 * 30);
    const pastDate = new Date(Date.now() - 86400000);

    it('should use snapshot tiers and return full refund when far out', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        policyName: 'Standard',
        tiers: [
          { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
          { fromHours: 72, toHours: 167, refundPercentage: 50, sortOrder: 2 },
          { fromHours: 0, toHours: 71, refundPercentage: 0, sortOrder: 3 },
        ],
      } as any);
      const result = await service.calculateRefund(
        'booking-1',
        2000,
        futureDate,
      );
      expect(result.refundPercentage).toBe(100);
      expect(result.refundAmount).toBe(2000);
      expect(result.policyName).toBe('Standard');
    });

    it('should return 0 refund when trek has already started', async () => {
      snapshotRepo.findOne.mockResolvedValue({
        policyName: 'Standard',
        tiers: [] as any,
      } as any);
      const result = await service.calculateRefund('booking-1', 2000, pastDate);
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0);
    });

    it('should throw when no snapshot exists', async () => {
      snapshotRepo.findOne.mockResolvedValue(null);
      await expect(
        service.calculateRefund('booking-1', 2000, futureDate),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
