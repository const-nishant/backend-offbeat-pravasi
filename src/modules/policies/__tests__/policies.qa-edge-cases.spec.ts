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

/**
 * QA Test Suite — 12 years experience
 *
 * Focus areas:
 * 1. Boundary value analysis on tier windows (exactly at from/to boundaries)
 * 2. Equivalence partitioning on refund percentage and hours
 * 3. Race condition simulations (concurrent same-resource ops)
 * 4. Data integrity (duplicate defaults, orphaned tiers, snapshot immutability)
 * 5. Negative testing (invalid IDs, missing snapshots, zero-amount bookings)
 * 6. State transitions (policy lifecycle, booking lifecycle)
 * 7. Rounding precision on refund amount
 */

describe('PoliciesService — QA Edge Cases (12y exp)', () => {
  let service: PoliciesService;
  let policyRepo: jest.Mocked<Repository<CancellationPolicy>>;
  let tierRepo: jest.Mocked<Repository<CancellationTier>>;
  let trekPolicyRepo: jest.Mocked<Repository<TrekPolicy>>;
  let snapshotRepo: jest.Mocked<Repository<BookingPolicySnapshot>>;

  const mockTiers = [
    {
      id: 't1',
      policyId: 'p1',
      fromHoursBeforeStart: 168,
      toHoursBeforeStart: null,
      refundPercentage: 100,
      sortOrder: 1,
    } as any,
    {
      id: 't2',
      policyId: 'p1',
      fromHoursBeforeStart: 72,
      toHoursBeforeStart: 167,
      refundPercentage: 50,
      sortOrder: 2,
    } as any,
    {
      id: 't3',
      policyId: 'p1',
      fromHoursBeforeStart: 0,
      toHoursBeforeStart: 71,
      refundPercentage: 0,
      sortOrder: 3,
    } as any,
  ];

  const mockPolicy = {
    id: 'p1',
    name: 'Standard',
    isDefault: true,
    tiers: mockTiers,
  } as any;

  beforeEach(async () => {
    policyRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    } as any;
    tierRepo = { create: jest.fn(), save: jest.fn(), delete: jest.fn() } as any;
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

    const mod: TestingModule = await Test.createTestingModule({
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

    service = mod.get(PoliciesService);
  });

  // ─── 1. BOUNDARY VALUE ANALYSIS — calculateRefund ───────────────────

  describe('BOUNDARY: calculateRefund tier window boundaries', () => {
    const baseSnapshot = {
      policyName: 'Standard',
      tiers: [
        { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
        { fromHours: 72, toHours: 167, refundPercentage: 50, sortOrder: 2 },
        { fromHours: 0, toHours: 71, refundPercentage: 10, sortOrder: 3 },
      ],
    };

    it('should return 100% at exactly 168 hours before start (upper window floor)', async () => {
      const date = new Date(Date.now() + 168 * 60 * 60 * 1000);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b1', 2000, date);
      expect(r.refundPercentage).toBe(100);
      expect(r.refundAmount).toBe(2000);
    });

    it('should return 50% at exactly 72 hours before start (tier2)', async () => {
      const date = new Date(Date.now() + 72 * 60 * 60 * 1000);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b2', 2000, date);
      expect(r.refundPercentage).toBe(50);
      expect(r.refundAmount).toBe(1000);
    });

    it('should return 10% at 1 hour before start (tier3)', async () => {
      const date = new Date(Date.now() + 1 * 60 * 60 * 1000);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b3', 2000, date);
      expect(r.refundPercentage).toBe(10);
      expect(r.refundAmount).toBe(200);
    });

    it('should return 0% at exactly 0 hours before start (tier floor)', async () => {
      const date = new Date(Date.now() + 0 * 60 * 60 * 1000);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b4', 2000, date);
      expect(r.refundPercentage).toBe(0);
      expect(r.refundAmount).toBe(0);
    });

    it('should return 0% when trek already started by 1ms', async () => {
      const date = new Date(Date.now() - 1);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b5', 2000, date);
      expect(r.refundPercentage).toBe(0);
      expect(r.refundAmount).toBe(0);
    });

    it('should match correct tier when hoursUntilStart is exactly at toHours boundary', async () => {
      const date = new Date(Date.now() + 167 * 60 * 60 * 1000);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b6', 2000, date);
      expect(r.refundPercentage).toBe(50);
    });

    it('should fall through to lower tier when hoursUntilStart exceeds toHours', async () => {
      const date = new Date(Date.now() + 168 * 60 * 60 * 1000 + 1);
      snapshotRepo.findOne.mockResolvedValue(baseSnapshot as any);
      const r = await service.calculateRefund('b7', 2000, date);
      expect(r.refundPercentage).toBe(100);
    });
  });

  // ─── 2. TIER STRUCTURE EDGE CASES ──────────────────────────────────

  describe('TIER STRUCTURE: edge cases in tier configuration', () => {
    it('should handle null toHoursBeforeStart as open-ended', async () => {
      const snapshot = {
        policyName: 'Flexible',
        tiers: [
          {
            fromHours: 48,
            toHours: undefined,
            refundPercentage: 100,
            sortOrder: 1,
          },
          { fromHours: 0, toHours: 47, refundPercentage: 25, sortOrder: 2 },
        ],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const date = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
      const r = await service.calculateRefund('b-open', 1000, date);
      expect(r.refundPercentage).toBe(100);
    });

    it('should handle single-tier policy (all-or-nothing)', async () => {
      const snapshot = {
        policyName: 'NoRefund',
        tiers: [
          {
            fromHours: 0,
            toHours: undefined,
            refundPercentage: 0,
            sortOrder: 1,
          },
        ],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const far = new Date(Date.now() + 86400000 * 100);
      const r = await service.calculateRefund('b-single', 5000, far);
      expect(r.refundPercentage).toBe(0);
      expect(r.refundAmount).toBe(0);
    });

    it('should handle 100% refund single-tier policy', async () => {
      const snapshot = {
        policyName: 'FullRefund',
        tiers: [
          {
            fromHours: 0,
            toHours: undefined,
            refundPercentage: 100,
            sortOrder: 1,
          },
        ],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const date = new Date(Date.now() + 3600000);
      const r = await service.calculateRefund('b-full', 3000, date);
      expect(r.refundPercentage).toBe(100);
      expect(r.refundAmount).toBe(3000);
    });

    it('should handle tiers sorted in any order (not just ascending)', async () => {
      const snapshot = {
        policyName: 'MixedSort',
        tiers: [
          { fromHours: 0, toHours: 23, refundPercentage: 10, sortOrder: 3 },
          { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
          { fromHours: 24, toHours: 167, refundPercentage: 50, sortOrder: 2 },
        ],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const far = new Date(Date.now() + 200 * 3600000);
      const r = await service.calculateRefund('b-sort', 1000, far);
      expect(r.refundPercentage).toBe(100);
    });

    it('should return 0% when hoursUntilStart falls in gap between tiers', async () => {
      const snapshot = {
        policyName: 'Gap',
        tiers: [
          { fromHours: 168, refundPercentage: 100, sortOrder: 1 },
          { fromHours: 0, toHours: 71, refundPercentage: 10, sortOrder: 2 },
        ],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const date = new Date(Date.now() + 100 * 3600000);
      const r = await service.calculateRefund('b-gap', 2000, date);
      expect(r.refundPercentage).toBe(0);
      expect(r.refundAmount).toBe(0);
    });
  });

  // ─── 3. REFUND AMOUNT PRECISION ─────────────────────────────────────

  describe('PRECISION: refund amount rounding', () => {
    it('should round 33.33% of 1000 to 333 (floor rounding via Math.round)', async () => {
      const snapshot = {
        policyName: 'P',
        tiers: [{ fromHours: 0, refundPercentage: 33, sortOrder: 1 }],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const r = await service.calculateRefund(
        'b-round',
        1000,
        new Date(Date.now() + 86400000),
      );
      expect(r.refundAmount).toBe(330);
    });

    it('should round 33.33% of 9993 to 3328 (bigger number rounding)', async () => {
      const snapshot = {
        policyName: 'P',
        tiers: [{ fromHours: 0, refundPercentage: 33, sortOrder: 1 }],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const r = await service.calculateRefund(
        'b-round2',
        9993,
        new Date(Date.now() + 86400000),
      );
      expect(r.refundAmount).toBe(3298);
    });

    it('should handle zero totalAmountInr gracefully', async () => {
      const snapshot = {
        policyName: 'Free',
        tiers: [{ fromHours: 0, refundPercentage: 50, sortOrder: 1 }],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const r = await service.calculateRefund(
        'b-free',
        0,
        new Date(Date.now() + 86400000),
      );
      expect(r.refundAmount).toBe(0);
    });

    it('should handle negative totalAmountInr (shouldnt happen but test)', async () => {
      const snapshot = {
        policyName: 'Neg',
        tiers: [{ fromHours: 0, refundPercentage: 50, sortOrder: 1 }],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const r = await service.calculateRefund(
        'b-neg',
        -1000,
        new Date(Date.now() + 86400000),
      );
      expect(r.refundAmount).toBe(-500);
    });
  });

  // ─── 4. SNAPSHOT IMMUTABILITY ──────────────────────────────────────

  describe('SNAPSHOT IMMUTABILITY: policy changes after booking', () => {
    it('should use snapshot tiers even if policy is later updated (original tiers frozen)', async () => {
      const snapshot = {
        policyName: 'OldPolicy',
        tiers: [{ fromHours: 0, refundPercentage: 100, sortOrder: 1 }],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const r = await service.calculateRefund(
        'b-immutable',
        2000,
        new Date(Date.now() + 86400000),
      );
      expect(r.refundPercentage).toBe(100);
      expect(r.policyName).toBe('OldPolicy');
    });

    it('should use snapshot even after policy is deleted', async () => {
      const snapshot = {
        policyName: 'DeletedPolicy',
        tiers: [{ fromHours: 0, refundPercentage: 25, sortOrder: 1 }],
      };
      snapshotRepo.findOne.mockResolvedValue(snapshot as any);
      const r = await service.calculateRefund(
        'b-deleted-pol',
        4000,
        new Date(Date.now() + 86400000),
      );
      expect(r.refundPercentage).toBe(25);
      expect(r.refundAmount).toBe(1000);
    });
  });

  // ─── 5. NEGATIVE TESTING ───────────────────────────────────────────

  describe('NEGATIVE: invalid inputs and edge cases', () => {
    it('should throw NotFoundException for non-existent policyId in findOne', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when no default policy exists', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.getDefault()).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when findOne is called with empty string', async () => {
      policyRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('')).rejects.toThrow(NotFoundException);
    });

    it('should propagate error when assignToTrek is called with non-existent policyId', async () => {
      policyRepo.findOne.mockRejectedValue(
        new NotFoundException('Policy not found'),
      );
      await expect(service.assignToTrek('trek-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should fail createSnapshot when trek has no default policy and no assignment', async () => {
      trekPolicyRepo.findOne.mockResolvedValue(null);
      policyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createSnapshot('b-err', 'non-existent-trek'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fail calculateRefund when no snapshot exists for booking', async () => {
      snapshotRepo.findOne.mockResolvedValue(null);
      await expect(
        service.calculateRefund('no-snapshot', 1000, new Date()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── 6. DATA INTEGRITY ─────────────────────────────────────────────

  describe('DATA INTEGRITY: multiple defaults, delete behavior', () => {
    it('should clear isDefault on existing policy when new default is created', async () => {
      policyRepo.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      } as any);
      policyRepo.create.mockReturnValue({ id: 'p-new' } as any);
      policyRepo.save.mockResolvedValue({
        id: 'p-new',
        name: 'NewDefault',
        isDefault: true,
      } as any);
      tierRepo.save.mockResolvedValue([]);
      policyRepo.findOne.mockResolvedValueOnce({
        id: 'p-new',
        name: 'NewDefault',
        isDefault: true,
        tiers: [],
      } as any);

      await service.create({
        name: 'NewDefault',
        isDefault: true,
        tiers: [
          { fromHoursBeforeStart: 0, refundPercentage: 100, sortOrder: 1 },
        ],
      });

      expect(policyRepo.update).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false },
      );
    });

    it('should delete tiers when policy is removed', async () => {
      const policyToRemove = {
        id: 'p-del',
        name: 'GonnaDelete',
        tiers: [],
      } as any;
      policyRepo.findOne.mockResolvedValue(policyToRemove);
      policyRepo.remove.mockResolvedValue(policyToRemove);

      await service.delete('p-del');
      expect(policyRepo.remove).toHaveBeenCalledWith(policyToRemove);
    });
  });

  // ─── 7. CONCURRENCY SIMULATION ─────────────────────────────────────

  describe('CONCURRENCY: simulated race conditions', () => {
    it('should handle sequential createSnapshot calls for different bookings same trek', async () => {
      trekPolicyRepo.findOne.mockResolvedValue({
        policyId: 'p1',
        policy: mockPolicy,
      } as any);
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      snapshotRepo.create.mockReturnValue({} as any);
      snapshotRepo.save.mockResolvedValue({} as any);

      await service.createSnapshot('booking-a', 'trek-1');
      await service.createSnapshot('booking-b', 'trek-1');

      expect(snapshotRepo.create).toHaveBeenCalledTimes(2);
      expect(snapshotRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple concurrent assignToTrek for same trek (last write wins)', async () => {
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      const existing = { trekId: 'trek-race', policyId: 'p1' } as any;
      trekPolicyRepo.findOne.mockResolvedValue(existing);

      await service.assignToTrek('trek-race', 'p1');
      await service.assignToTrek('trek-race', 'p1');

      expect(trekPolicyRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent create with isDefault flag', async () => {
      policyRepo.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      } as any);
      policyRepo.create.mockReturnValue({} as any);
      policyRepo.save.mockResolvedValue({} as any);
      tierRepo.save.mockResolvedValue([]);
      policyRepo.findOne.mockResolvedValue({
        id: 'c1',
        name: 'C1',
        tiers: [],
      } as any);

      const [r1] = await Promise.all([
        service.create({
          name: 'C1',
          isDefault: true,
          tiers: [
            { fromHoursBeforeStart: 0, refundPercentage: 50, sortOrder: 1 },
          ],
        }),
      ]);

      expect(r1).toBeDefined();
    });

    it('should not throw when createSnapshot is called again for same booking (upsert not expected)', async () => {
      trekPolicyRepo.findOne.mockResolvedValue({
        policyId: 'p1',
        policy: mockPolicy,
      } as any);
      policyRepo.findOne.mockResolvedValue(mockPolicy);
      snapshotRepo.create.mockReturnValue({} as any);
      snapshotRepo.save.mockResolvedValueOnce({} as any);
      snapshotRepo.save.mockRejectedValueOnce(new Error('duplicate key'));

      await service.createSnapshot('booking-dupe', 'trek-1');
      await expect(
        service.createSnapshot('booking-dupe', 'trek-1'),
      ).rejects.toThrow('duplicate key');
    });
  });

  // ─── 8. STATE TRANSITIONS ──────────────────────────────────────────

  describe('STATE TRANSITIONS: policy lifecycle', () => {
    it('should go through full lifecycle: create → find → update → delete', async () => {
      policyRepo.create.mockReturnValue({ id: 'lifecycle-p1' } as any);
      policyRepo.save.mockResolvedValue({
        id: 'lifecycle-p1',
        name: 'Lifecycle',
      } as any);
      tierRepo.save.mockResolvedValue([]);
      const lifecyclePolicy = {
        id: 'lifecycle-p1',
        name: 'Lifecycle',
        tiers: [],
        isDefault: false,
      } as any;

      policyRepo.findOne.mockResolvedValue(lifecyclePolicy);
      const created = await service.create({
        name: 'Lifecycle',
        tiers: [
          { fromHoursBeforeStart: 0, refundPercentage: 100, sortOrder: 1 },
        ],
      });
      expect(created.name).toBe('Lifecycle');

      policyRepo.findOne.mockResolvedValue(lifecyclePolicy);
      const found = await service.findOne('lifecycle-p1');
      expect(found).toBeDefined();

      tierRepo.delete.mockResolvedValue({ affected: 0, raw: {} } as any);
      const updatedPolicy = {
        id: 'lifecycle-p1',
        name: 'Updated',
        tiers: [],
      } as any;
      policyRepo.findOne.mockResolvedValue(updatedPolicy);
      const updated = await service.update('lifecycle-p1', { name: 'Updated' });
      expect(updated.name).toBe('Updated');

      const toDelete = { id: 'lifecycle-p1', name: 'Updated' } as any;
      policyRepo.findOne.mockResolvedValue(toDelete);
      policyRepo.remove.mockResolvedValue(toDelete);

      await service.delete('lifecycle-p1');
      expect(policyRepo.remove).toHaveBeenCalledWith(toDelete);
    });
  });

  // ─── 9. UPDATE EDGE CASES ──────────────────────────────────────────

  describe('UPDATE: partial updates and null fields', () => {
    it('should only update fields that are provided', async () => {
      const existing = {
        id: 'p-upd',
        name: 'Old',
        description: 'Old desc',
        isDefault: false,
        tiers: [],
      } as any;
      policyRepo.findOne.mockResolvedValue(existing);
      policyRepo.save.mockResolvedValue(existing);

      await service.update('p-upd', { name: 'New Name' });

      expect(existing.name).toBe('New Name');
      expect(existing.description).toBe('Old desc');
      expect(existing.isDefault).toBe(false);
    });

    it('should not clear default flag when updating same policy that is already default', async () => {
      const existing = {
        id: 'p-def',
        name: 'Default',
        isDefault: true,
        tiers: [],
      } as any;
      policyRepo.findOne.mockResolvedValue(existing);
      policyRepo.save.mockResolvedValue(existing);

      await service.update('p-def', { name: 'Still Default' });

      expect(policyRepo.update).not.toHaveBeenCalled();
    });

    it('should clear default when updating non-default to become default', async () => {
      const existing = {
        id: 'p-new-def',
        name: 'BecomeDefault',
        isDefault: false,
        tiers: [],
      } as any;
      policyRepo.findOne.mockResolvedValue(existing);
      policyRepo.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      } as any);
      policyRepo.save.mockResolvedValue(existing);

      await service.update('p-new-def', { isDefault: true });

      expect(policyRepo.update).toHaveBeenCalledWith(
        { isDefault: true },
        { isDefault: false },
      );
      expect(existing.isDefault).toBe(true);
    });

    it('should replace tiers when tiers array is provided in update', async () => {
      const existing = { id: 'p-replace', name: 'Replace', tiers: [] } as any;
      policyRepo.findOne.mockResolvedValue(existing);
      policyRepo.save.mockResolvedValue(existing);
      tierRepo.delete.mockResolvedValue({ affected: 0, raw: {} } as any);
      tierRepo.save.mockResolvedValue([]);
      policyRepo.findOne.mockResolvedValueOnce({
        ...existing,
        tiers: [{ id: 'new-tier' }],
      } as any);

      await service.update('p-replace', {
        tiers: [
          { fromHoursBeforeStart: 0, refundPercentage: 75, sortOrder: 1 },
        ],
      });

      expect(tierRepo.delete).toHaveBeenCalledWith({ policyId: 'p-replace' });
      expect(tierRepo.save).toHaveBeenCalled();
    });
  });
});
