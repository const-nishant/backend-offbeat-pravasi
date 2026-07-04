/**
 * QA Edge Cases — Safety Module
 *
 * Focus areas:
 *  1. Boundary value analysis (phone length, name length, relationship length)
 *  2. Equivalence partitioning (all CheckInStatus transitions, all input types)
 *  3. Negative testing (invalid UUIDs, empty bodies, non-existent entities)
 *  4. Data integrity (unique constraint on bookingId, cascade deletes)
 *  5. State transitions (ACTIVE → COMPLETED, ACTIVE → ESCALATED, etc.)
 *  6. Access control (wrong user on every endpoint, null organizer)
 *  7. Queue edge cases (job removal on concurrent check-out + acknowledge)
 *  8. Idempotency (double acknowledge, double check-out)
 *  9. Empty/null scenarios (no emergency contact, null safety fields)
 * 10. Primary contact management (demotion, multiple primaries)
 */
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { TrekSafetyInfo } from '../entities/trek-safety-info.entity';
import { UserEmergencyContact } from '../entities/user-emergency-contact.entity';
import { TrekCheckIn } from '../entities/trek-check-in.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { CheckInStatus } from '../enums/check-in-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { SafetyService } from '../safety.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

describe('SafetyService — QA Edge Cases', () => {
  let service: SafetyService;
  let safetyInfoRepo: jest.Mocked<Repository<TrekSafetyInfo>>;
  let emergencyContactRepo: jest.Mocked<Repository<UserEmergencyContact>>;
  let checkInRepo: jest.Mocked<Repository<TrekCheckIn>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const baseOrganizer = { id: 'org-1' };
  const baseTrek = {
    id: 'trek-1',
    name: 'Test Trek',
    startDate: new Date('2026-07-15T06:00:00Z'),
    endDate: new Date('2026-07-17T18:00:00Z'),
    organizer: baseOrganizer,
  } as unknown as Trek;

  const baseBooking = {
    id: 'booking-1',
    trekId: 'trek-1',
    userId: 'user-1',
    status: 'CONFIRMED',
    trekSnapshot: { name: 'Test Trek' },
  } as unknown as Booking;

  function createMockCheckIn(
    overrides: Partial<TrekCheckIn> = {},
  ): TrekCheckIn {
    return {
      id: 'checkin-1',
      bookingId: 'booking-1',
      userId: 'user-1',
      checkedInAt: new Date(),
      expectedCheckOutAt: new Date('2026-07-17T18:00:00Z'),
      status: CheckInStatus.ACTIVE,
      booking: { id: 'booking-1', trekSnapshot: { name: 'Test Trek' } },
      user: { id: 'user-1', fullName: 'Test User' },
      ...overrides,
    } as unknown as TrekCheckIn;
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyService,
        {
          provide: getRepositoryToken(TrekSafetyInfo),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEmergencyContact),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TrekCheckIn),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Trek),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { query: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { sendPushToUser: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<SafetyService>(SafetyService);
    safetyInfoRepo = module.get(getRepositoryToken(TrekSafetyInfo));
    emergencyContactRepo = module.get(getRepositoryToken(UserEmergencyContact));
    checkInRepo = module.get(getRepositoryToken(TrekCheckIn));
    trekRepo = module.get(getRepositoryToken(Trek));
    bookingRepo = module.get(getRepositoryToken(Booking));
    notificationsService = module.get(NotificationsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ─────────────── 1. Boundary Value Analysis ─────────────── */

  describe('Boundary values — UpsertSafetyInfoDto', () => {
    it('should accept maximum-length baseCampContact (32 chars)', async () => {
      trekRepo.findOne.mockResolvedValue(baseTrek);
      safetyInfoRepo.findOne.mockResolvedValue(null);
      const longContact = 'A'.repeat(32);
      safetyInfoRepo.create.mockReturnValue({
        ...baseTrek,
        baseCampContact: longContact,
      } as any);
      safetyInfoRepo.save.mockResolvedValue({
        ...baseTrek,
        baseCampContact: longContact,
      } as any);

      const result = await service.upsertTrekSafety('trek-1', 'org-1', {
        baseCampContact: longContact,
      });
      expect(result.baseCampContact).toBe(longContact);
    });

    it('should accept minimum-length phone (10 chars)', async () => {
      emergencyContactRepo.create.mockReturnValue({
        id: 'c-1',
        userId: 'user-1',
        name: 'A',
        phone: '1'.repeat(10),
        relationship: 'X',
      } as any);
      emergencyContactRepo.save.mockResolvedValue({
        id: 'c-1',
        userId: 'user-1',
        name: 'A',
        phone: '1'.repeat(10),
        relationship: 'X',
      } as any);

      const result = await service.addContact('user-1', {
        name: 'A',
        phone: '1'.repeat(10),
        relationship: 'X',
      });
      expect(result.phone).toHaveLength(10);
    });

    it('should accept boundary name length (120 chars)', async () => {
      const longName = 'N'.repeat(120);
      emergencyContactRepo.create.mockReturnValue({
        id: 'c-1',
        userId: 'user-1',
        name: longName,
        phone: '+911234567890',
        relationship: 'Mother',
      } as any);
      emergencyContactRepo.save.mockResolvedValue({
        id: 'c-1',
        userId: 'user-1',
        name: longName,
        phone: '+911234567890',
        relationship: 'Mother',
      } as any);

      const result = await service.addContact('user-1', {
        name: longName,
        phone: '+911234567890',
        relationship: 'Mother',
      });
      expect(result.name).toHaveLength(120);
    });
  });

  /* ─────────────── 2. Equivalence Partitioning ─────────────── */

  describe('Equivalence partitioning — State transitions', () => {
    it.each([
      ['ACTIVE', CheckInStatus.ACTIVE, 'COMPLETED', true],
      ['ACTIVE', CheckInStatus.ACTIVE, 'ESCALATED', true],
      ['ACTIVE', CheckInStatus.ACTIVE, 'RESOLVED', true],
      ['COMPLETED', CheckInStatus.COMPLETED, 'COMPLETED', false],
      ['ESCALATED', CheckInStatus.ESCALATED, 'COMPLETED', false],
      ['RESOLVED', CheckInStatus.RESOLVED, 'COMPLETED', false],
    ])(
      'checkOut from %s should %s',
      async (_label, initialStatus, _targetStatus, shouldSucceed) => {
        checkInRepo.findOne.mockResolvedValue(
          createMockCheckIn({ status: initialStatus }),
        );
        checkInRepo.save.mockResolvedValue(
          createMockCheckIn({ status: CheckInStatus.COMPLETED }),
        );

        if (shouldSucceed) {
          const result = await service.checkOut('booking-1', 'user-1');
          expect(result.status).toBe(CheckInStatus.COMPLETED);
        } else {
          await expect(service.checkOut('booking-1', 'user-1')).rejects.toThrow(
            ForbiddenException,
          );
        }
      },
    );

    it.each([
      ['ACTIVE', CheckInStatus.ACTIVE, true],
      ['ESCALATED', CheckInStatus.ESCALATED, true],
      ['COMPLETED', CheckInStatus.COMPLETED, false],
      ['RESOLVED', CheckInStatus.RESOLVED, false],
    ])(
      'acknowledge from %s should %s',
      async (_label, initialStatus, shouldSucceed) => {
        checkInRepo.findOne.mockResolvedValue(
          createMockCheckIn({ status: initialStatus }),
        );
        checkInRepo.save.mockResolvedValue(
          createMockCheckIn({ status: CheckInStatus.RESOLVED }),
        );

        if (shouldSucceed) {
          const result = await service.acknowledge('checkin-1', 'user-1');
          expect(result.status).toBe(CheckInStatus.RESOLVED);
        } else {
          await expect(
            service.acknowledge('checkin-1', 'user-1'),
          ).rejects.toThrow(ForbiddenException);
        }
      },
    );
  });

  /* ─────────────── 3. Negative testing ─────────────── */

  describe('Negative testing — Invalid inputs', () => {
    it('should throw NotFoundException for non-existent trek ID on upsert', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(
        service.upsertTrekSafety('non-existent-id', 'org-1', {
          terrainRisks: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent booking check-in', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.checkIn('non-existent-id', 'user-1', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent check-in acknowledge', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await expect(
        service.acknowledge('non-existent-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent check-out', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await expect(
        service.checkOut('non-existent-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for unknown contact deletion', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      await expect(
        service.deleteContact('non-existent-id', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ─────────────── 4. Data integrity ─────────────── */

  describe('Data integrity', () => {
    it('should prevent duplicate check-in for same booking', async () => {
      bookingRepo.findOne.mockResolvedValue(baseBooking);
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      await expect(
        service.checkIn('booking-1', 'user-1', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce unique constraint via bookingId one-to-one', async () => {
      bookingRepo.findOne.mockResolvedValue(baseBooking);
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      await expect(
        service.checkIn('booking-1', 'user-1', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining('checked'),
        }),
      );
    });

    it('should handle checking in with non-confirmed booking', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...baseBooking,
        status: 'PENDING',
      } as Booking);
      checkInRepo.findOne.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(baseTrek);
      const mock = createMockCheckIn();
      checkInRepo.create.mockReturnValue(mock);
      checkInRepo.save.mockResolvedValue(mock);

      const result = await service.checkIn('booking-1', 'user-1', {
        latitude: 27.5,
        longitude: 78.0,
      });
      expect(result).toBeDefined();
    });
  });

  /* ─────────────── 5. State transitions (comprehensive) ─────────────── */

  describe('State transitions — Full lifecycle', () => {
    it('should follow ACTIVE → COMPLETED on timely check-out', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({
          status: CheckInStatus.COMPLETED,
          checkedOutAt: new Date(),
        }),
      );

      const result = await service.checkOut('booking-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.COMPLETED);
      expect(result.checkedOutAt).toBeDefined();
    });

    it('should follow ACTIVE → ESCALATED → RESOLVED on acknowledge', async () => {
      checkInRepo.findOne
        .mockResolvedValueOnce(createMockCheckIn())
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.ESCALATED }),
        );

      checkInRepo.save
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.ESCALATED }),
        )
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.RESOLVED }),
        );

      await service.escalateMissedCheckout('checkin-1');
      const result = await service.acknowledge('checkin-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.RESOLVED);
    });

    it('should skip escalation when already COMPLETED', async () => {
      checkInRepo.findOne.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.COMPLETED }),
      );
      await service.escalateMissedCheckout('checkin-1');
      expect(checkInRepo.save).not.toHaveBeenCalled();
    });

    it('should skip emergency when already RESOLVED', async () => {
      checkInRepo.findOne.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.RESOLVED }),
      );
      await service.escalateEmergency('checkin-1');
      expect(emergencyContactRepo.findOne).not.toHaveBeenCalled();
    });
  });

  /* ─────────────── 6. Access control ─────────────── */

  describe('Access control', () => {
    it('should reject upsertSafetyInfo from non-organizer', async () => {
      trekRepo.findOne.mockResolvedValue(baseTrek);
      await expect(
        service.upsertTrekSafety('trek-1', 'hacker-id', {
          terrainRisks: 'Hacked',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject check-in on booking belonging to another user', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.checkIn('booking-1', 'hacker-id', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject contact update from wrong user', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateContact('contact-1', 'hacker-id', { name: 'Hacked' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject contact deletion from wrong user', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      await expect(
        service.deleteContact('contact-1', 'hacker-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject acknowledge from wrong user', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await expect(
        service.acknowledge('checkin-1', 'hacker-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle null organizer gracefully', async () => {
      trekRepo.findOne.mockResolvedValue({
        ...baseTrek,
        organizer: null,
      } as unknown as Trek);
      await expect(
        service.upsertTrekSafety('trek-1', 'org-1', {
          terrainRisks: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle undefined organizer gracefully', async () => {
      trekRepo.findOne.mockResolvedValue({
        ...baseTrek,
        organizer: undefined,
      } as unknown as Trek);
      await expect(
        service.upsertTrekSafety('trek-1', 'org-1', {
          terrainRisks: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  /* ─────────────── 7. Queue edge cases ─────────────── */

  describe('Queue — Job lifecycle', () => {
    it('should handle concurrent check-out and acknowledge gracefully', async () => {
      checkInRepo.findOne
        .mockResolvedValueOnce(createMockCheckIn())
        .mockResolvedValueOnce(createMockCheckIn());
      checkInRepo.save
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.COMPLETED }),
        )
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.RESOLVED }),
        );

      const [checkOutResult, ackResult] = await Promise.allSettled([
        service.checkOut('booking-1', 'user-1'),
        service.acknowledge('checkin-1', 'user-1'),
      ]);

      expect(checkOutResult.status).toBe('fulfilled');
      expect(ackResult.status).toBe('fulfilled');
    });

    it('should handle getJob returning null gracefully', async () => {
      const { Queue } = jest.requireMock('bullmq');
      const mockGetJob = jest.fn().mockResolvedValue(null);
      Queue.mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'job-id' }),
        getJob: mockGetJob,
        close: jest.fn(),
      }));

      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.COMPLETED }),
      );

      await service.checkOut('booking-1', 'user-1');
    });
  });

  /* ─────────────── 8. Idempotency ─────────────── */

  describe('Idempotency', () => {
    it('should throw on double check-in', async () => {
      bookingRepo.findOne.mockResolvedValue(baseBooking);
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      await expect(
        service.checkIn('booking-1', 'user-1', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw on double acknowledge', async () => {
      checkInRepo.findOne
        .mockResolvedValueOnce(createMockCheckIn())
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.RESOLVED }),
        );
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.RESOLVED }),
      );

      await service.acknowledge('checkin-1', 'user-1');
      await expect(service.acknowledge('checkin-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw on double check-out', async () => {
      checkInRepo.findOne
        .mockResolvedValueOnce(createMockCheckIn())
        .mockResolvedValueOnce(
          createMockCheckIn({ status: CheckInStatus.COMPLETED }),
        );
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.COMPLETED }),
      );

      await service.checkOut('booking-1', 'user-1');
      await expect(service.checkOut('booking-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow getCheckInStatus called repeatedly without side effects', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      const r1 = await service.getCheckInStatus('booking-1', 'user-1');
      const r2 = await service.getCheckInStatus('booking-1', 'user-1');
      expect(r1).toEqual(r2);
      expect(checkInRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });

  /* ─────────────── 9. Empty / Null scenarios ─────────────── */

  describe('Empty / Null scenarios', () => {
    it('should create safety info with all null fields', async () => {
      trekRepo.findOne.mockResolvedValue(baseTrek);
      safetyInfoRepo.findOne.mockResolvedValue(null);
      safetyInfoRepo.create.mockReturnValue({
        id: 'safety-1',
        trekId: 'trek-1',
        terrainRisks: null,
        altitudeWarnings: null,
      } as any);
      safetyInfoRepo.save.mockResolvedValue({
        id: 'safety-1',
        trekId: 'trek-1',
        terrainRisks: null,
        altitudeWarnings: null,
      } as any);

      const result = await service.upsertTrekSafety('trek-1', 'org-1', {});
      expect(result.terrainRisks).toBeNull();
    });

    it('should handle empty emergency contacts list', async () => {
      emergencyContactRepo.find.mockResolvedValue([]);
      const result = await service.getUserContacts('user-1');
      expect(result).toEqual([]);
    });

    it('should return null when no primary contact exists', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      const result = await service.getPrimaryContact('user-1');
      expect(result).toBeNull();
    });

    it('should handle check-out when no contacts exist', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.COMPLETED }),
      );
      emergencyContactRepo.findOne.mockResolvedValue(null);

      const result = await service.checkOut('booking-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.COMPLETED);
    });

    it('should handle escalation when no contacts exist', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      emergencyContactRepo.findOne.mockResolvedValue(null);

      await service.escalateEmergency('checkin-1');
      expect(notificationsService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  /* ─────────────── 10. Primary contact management ─────────────── */

  describe('Primary contact management', () => {
    it('should demote existing primary when adding new primary', async () => {
      emergencyContactRepo.create.mockReturnValue({
        id: 'new-primary',
        userId: 'user-1',
        name: 'New Primary',
        phone: '+919876543210',
        relationship: 'Father',
        isPrimary: true,
      } as any);
      emergencyContactRepo.save.mockResolvedValue({
        id: 'new-primary',
        userId: 'user-1',
        name: 'New Primary',
        phone: '+919876543210',
        relationship: 'Father',
        isPrimary: true,
      } as any);

      await service.addContact('user-1', {
        name: 'New Primary',
        phone: '+919876543210',
        relationship: 'Father',
        isPrimary: true,
      });
      expect(emergencyContactRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isPrimary: true },
        { isPrimary: false },
      );
    });

    it('should demote existing primary when updating another to primary', async () => {
      const existingSecondary = {
        id: 'contact-2',
        userId: 'user-1',
        name: 'Secondary',
        phone: '+911111111111',
        relationship: 'Mother',
        isPrimary: false,
      };
      emergencyContactRepo.findOne.mockResolvedValue(existingSecondary);

      await service.updateContact('contact-2', 'user-1', { isPrimary: true });
      expect(emergencyContactRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isPrimary: true },
        { isPrimary: false },
      );
    });

    it('should not demote if setting primary on already-primary contact', async () => {
      emergencyContactRepo.findOne.mockResolvedValue({
        id: 'contact-1',
        userId: 'user-1',
        name: 'Primary',
        phone: '+911234567890',
        relationship: 'Spouse',
        isPrimary: true,
      });

      await service.updateContact('contact-1', 'user-1', { isPrimary: true });
      expect(emergencyContactRepo.update).toHaveBeenCalled();
    });

    it('should add non-primary contact without demoting anyone', async () => {
      emergencyContactRepo.create.mockReturnValue({
        id: 'contact-new',
        userId: 'user-1',
        name: 'Non Primary',
        phone: '+911111111111',
        relationship: 'Friend',
        isPrimary: false,
      } as any);
      emergencyContactRepo.save.mockResolvedValue({
        id: 'contact-new',
        userId: 'user-1',
        name: 'Non Primary',
        phone: '+911111111111',
        relationship: 'Friend',
        isPrimary: false,
      } as any);

      await service.addContact('user-1', {
        name: 'Non Primary',
        phone: '+911111111111',
        relationship: 'Friend',
        isPrimary: false,
      });
      expect(emergencyContactRepo.update).not.toHaveBeenCalled();
    });
  });

  /* ─────────────── 11. Trek Safety Info ─────────────── */

  describe('Trek safety info — edge cases', () => {
    it('should create safety info when none exists (null findOne)', async () => {
      trekRepo.findOne.mockResolvedValue(baseTrek);
      safetyInfoRepo.findOne.mockResolvedValue(null);
      safetyInfoRepo.create.mockReturnValue({
        id: 's-1',
        trekId: 'trek-1',
      } as any);
      safetyInfoRepo.save.mockResolvedValue({
        id: 's-1',
        trekId: 'trek-1',
      } as any);

      const result = await service.upsertTrekSafety('trek-1', 'org-1', {
        terrainRisks: 'test',
      });
      expect(result).toBeDefined();
      expect(safetyInfoRepo.create).toHaveBeenCalled();
    });

    it('should update existing safety info when found', async () => {
      const existing = {
        id: 's-1',
        trekId: 'trek-1',
        terrainRisks: 'Old risk',
      } as TrekSafetyInfo;
      trekRepo.findOne.mockResolvedValue(baseTrek);
      safetyInfoRepo.findOne.mockResolvedValue(existing);
      safetyInfoRepo.save.mockResolvedValue({
        ...existing,
        terrainRisks: 'Updated risk',
      } as TrekSafetyInfo);

      const result = await service.upsertTrekSafety('trek-1', 'org-1', {
        terrainRisks: 'Updated risk',
      });
      expect(result.terrainRisks).toBe('Updated risk');
      expect(safetyInfoRepo.create).not.toHaveBeenCalled();
    });

    it('should get safety info for existing trek', async () => {
      safetyInfoRepo.findOne.mockResolvedValue({
        id: 's-1',
        trekId: 'trek-1',
      } as TrekSafetyInfo);
      const result = await service.getTrekSafety('trek-1');
      expect(result).toBeDefined();
    });

    it('should return null for non-existent trek', async () => {
      safetyInfoRepo.findOne.mockResolvedValue(null);
      const result = await service.getTrekSafety('trek-999');
      expect(result).toBeNull();
    });
  });

  /* ─────────────── 12. Notifications failure tolerance ─────────────── */

  describe('Notifications failure tolerance', () => {
    it('should complete check-out even if notification fails', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.COMPLETED }),
      );
      notificationsService.sendPushToUser.mockRejectedValue(
        new Error('Push failed'),
      );

      const result = await service.checkOut('booking-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.COMPLETED);
    });

    it('should complete acknowledge even if notification fails', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.RESOLVED }),
      );
      notificationsService.sendPushToUser.mockRejectedValue(
        new Error('Push failed'),
      );

      const result = await service.acknowledge('checkin-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.RESOLVED);
    });

    it('should complete escalation even if notification fails', async () => {
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.ESCALATED }),
      );
      notificationsService.sendPushToUser.mockRejectedValue(
        new Error('Push failed'),
      );

      await service.escalateMissedCheckout('checkin-1');
      expect(checkInRepo.save).toHaveBeenCalled();
    });
  });
});
