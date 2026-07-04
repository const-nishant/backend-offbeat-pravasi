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
import { NotificationType } from '../../notifications/enums/notification-type.enum';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  })),
  Worker: jest.fn(),
}));

describe('SafetyService', () => {
  let service: SafetyService;
  let safetyInfoRepo: jest.Mocked<Repository<TrekSafetyInfo>>;
  let emergencyContactRepo: jest.Mocked<Repository<UserEmergencyContact>>;
  let checkInRepo: jest.Mocked<Repository<TrekCheckIn>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockOrganizer = { id: 'org-1' };
  const mockTrek = {
    id: 'trek-1',
    name: 'Test Trek',
    startDate: new Date('2026-07-15T06:00:00Z'),
    endDate: new Date('2026-07-17T18:00:00Z'),
    organizer: mockOrganizer,
    latitude: 27.5,
    longitude: 78.0,
  } as unknown as Trek;

  const mockBooking = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
      booking: { id: 'booking-1', trekSnapshot: { name: 'Test Trek' } },
      user: { id: 'user-1', fullName: 'Test User' },
      ...overrides,
    } as unknown as TrekCheckIn;
  }

  const mockContact = {
    id: 'contact-1',
    userId: 'user-1',
    name: 'Emergency Person',
    phone: '+911234567890',
    relationship: 'Spouse',
    isPrimary: true,
  } as unknown as UserEmergencyContact;

  const mockSafetyInfo = {
    id: 'safety-1',
    trekId: 'trek-1',
    terrainRisks: 'Steep sections',
    altitudeWarnings: null,
  } as unknown as TrekSafetyInfo;

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
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendPushToUser: jest.fn().mockResolvedValue(undefined),
          },
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

  function setupActiveCheckIn(): void {
    checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
  }

  function setupCompletedCheckIn(): void {
    checkInRepo.findOne.mockResolvedValue(
      createMockCheckIn({ status: CheckInStatus.COMPLETED }),
    );
  }

  function setupEscalatedCheckIn(): void {
    checkInRepo.findOne.mockResolvedValue(
      createMockCheckIn({ status: CheckInStatus.ESCALATED }),
    );
  }

  function setupResolvedCheckIn(): void {
    checkInRepo.findOne.mockResolvedValue(
      createMockCheckIn({ status: CheckInStatus.RESOLVED }),
    );
  }

  describe('getTrekSafety', () => {
    it('should return safety info for a trek', async () => {
      safetyInfoRepo.findOne.mockResolvedValue(mockSafetyInfo);
      const result = await service.getTrekSafety('trek-1');
      expect(result).toEqual(mockSafetyInfo);
      expect(safetyInfoRepo.findOne).toHaveBeenCalledWith({
        where: { trekId: 'trek-1' },
      });
    });

    it('should return null when no safety info exists', async () => {
      safetyInfoRepo.findOne.mockResolvedValue(null);
      const result = await service.getTrekSafety('trek-1');
      expect(result).toBeNull();
    });
  });

  describe('upsertTrekSafety', () => {
    it('should create safety info when none exists', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      safetyInfoRepo.findOne.mockResolvedValue(null);
      safetyInfoRepo.create.mockReturnValue(mockSafetyInfo);
      safetyInfoRepo.save.mockResolvedValue(mockSafetyInfo);

      const result = await service.upsertTrekSafety('trek-1', 'org-1', {
        terrainRisks: 'Steep sections',
      });
      expect(result).toEqual(mockSafetyInfo);
      expect(safetyInfoRepo.create).toHaveBeenCalledWith({
        trekId: 'trek-1',
        terrainRisks: 'Steep sections',
      });
    });

    it('should update existing safety info', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      safetyInfoRepo.findOne.mockResolvedValue(mockSafetyInfo);
      safetyInfoRepo.save.mockResolvedValue({
        ...mockSafetyInfo,
        altitudeWarnings: 'AMS risk above 4000m',
      });

      const result = await service.upsertTrekSafety('trek-1', 'org-1', {
        altitudeWarnings: 'AMS risk above 4000m',
      });
      expect(result.altitudeWarnings).toBe('AMS risk above 4000m');
    });

    it('should throw NotFoundException when trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(
        service.upsertTrekSafety('trek-999', 'org-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the organizer', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      await expect(
        service.upsertTrekSafety('trek-1', 'wrong-user', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserContacts', () => {
    it('should return contacts ordered by primary then creation date', async () => {
      emergencyContactRepo.find.mockResolvedValue([mockContact]);
      const result = await service.getUserContacts('user-1');
      expect(result).toEqual([mockContact]);
      expect(emergencyContactRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });
    });

    it('should return empty array when no contacts exist', async () => {
      emergencyContactRepo.find.mockResolvedValue([]);
      const result = await service.getUserContacts('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('addContact', () => {
    it('should create a new emergency contact', async () => {
      emergencyContactRepo.create.mockReturnValue(mockContact);
      emergencyContactRepo.save.mockResolvedValue(mockContact);

      const result = await service.addContact('user-1', {
        name: 'Emergency Person',
        phone: '+911234567890',
        relationship: 'Spouse',
      });
      expect(result).toEqual(mockContact);
    });

    it('should demote existing primary when new contact is primary', async () => {
      emergencyContactRepo.create.mockReturnValue(mockContact);
      emergencyContactRepo.save.mockResolvedValue(mockContact);

      await service.addContact('user-1', {
        name: 'New Primary',
        phone: '+919876543210',
        relationship: 'Mother',
        isPrimary: true,
      });
      expect(emergencyContactRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isPrimary: true },
        { isPrimary: false },
      );
    });
  });

  describe('updateContact', () => {
    it('should update an existing contact', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);
      emergencyContactRepo.save.mockResolvedValue({
        ...mockContact,
        name: 'Updated Name',
      });

      const result = await service.updateContact('contact-1', 'user-1', {
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateContact('contact-999', 'user-1', { name: 'No' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when contact belongs to another user', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateContact('contact-1', 'user-2', { name: 'Hacker' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should demote existing primary when setting new primary', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);
      emergencyContactRepo.save.mockResolvedValue(mockContact);

      await service.updateContact('contact-1', 'user-1', { isPrimary: true });
      expect(emergencyContactRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1', isPrimary: true },
        { isPrimary: false },
      );
    });
  });

  describe('deleteContact', () => {
    it('should delete an existing contact', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);
      await service.deleteContact('contact-1', 'user-1');
      expect(emergencyContactRepo.remove).toHaveBeenCalledWith(mockContact);
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      await expect(
        service.deleteContact('contact-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkIn', () => {
    it('should create a check-in and schedule escalation jobs', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      checkInRepo.findOne.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(mockTrek);
      const expected = createMockCheckIn();
      checkInRepo.create.mockReturnValue(expected);
      checkInRepo.save.mockResolvedValue(expected);

      const result = await service.checkIn('booking-1', 'user-1', {
        latitude: 27.5,
        longitude: 78.0,
      });
      expect(result).toEqual(expected);
      expect(checkInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-1',
          userId: 'user-1',
          status: CheckInStatus.ACTIVE,
        }),
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.checkIn('booking-999', 'user-1', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own booking', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.checkIn('booking-1', 'wrong-user', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when already checked in', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      checkInRepo.findOne.mockResolvedValue(createMockCheckIn());
      await expect(
        service.checkIn('booking-1', 'user-1', {
          latitude: 27.5,
          longitude: 78.0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use trek endDate for expectedCheckOutAt', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      checkInRepo.findOne.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(mockTrek);
      checkInRepo.create.mockReturnValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(createMockCheckIn());

      await service.checkIn('booking-1', 'user-1', {
        latitude: 27.5,
        longitude: 78.0,
      });
      expect(checkInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedCheckOutAt: mockTrek.endDate,
        }),
      );
    });

    it('should use startDate when endDate is null', async () => {
      const trekNoEnd = { ...mockTrek, endDate: null };
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      checkInRepo.findOne.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(trekNoEnd);
      checkInRepo.create.mockReturnValue(createMockCheckIn());
      checkInRepo.save.mockResolvedValue(createMockCheckIn());

      await service.checkIn('booking-1', 'user-1', {
        latitude: 27.5,
        longitude: 78.0,
      });
      expect(checkInRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedCheckOutAt: mockTrek.startDate,
        }),
      );
    });
  });

  describe('checkOut', () => {
    it('should complete a check-out and remove pending jobs', async () => {
      setupActiveCheckIn();
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

    it('should throw NotFoundException when no check-in exists', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await expect(service.checkOut('booking-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when check-in is already completed', async () => {
      setupCompletedCheckIn();
      await expect(service.checkOut('booking-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when check-in is already escalated', async () => {
      setupEscalatedCheckIn();
      await expect(service.checkOut('booking-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should send notification on successful check-out', async () => {
      setupActiveCheckIn();
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.COMPLETED }),
      );

      await service.checkOut('booking-1', 'user-1');
      expect(notificationsService.sendPushToUser).toHaveBeenCalled();
    });
  });

  describe('getCheckInStatus', () => {
    it('should return check-in status', async () => {
      const expected = createMockCheckIn();
      checkInRepo.findOne.mockResolvedValue(expected);
      const result = await service.getCheckInStatus('booking-1', 'user-1');
      expect(result).toEqual(expected);
    });

    it('should return null when no check-in exists', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      const result = await service.getCheckInStatus('booking-1', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('acknowledge', () => {
    it('should resolve an active check-in', async () => {
      setupActiveCheckIn();
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({
          status: CheckInStatus.RESOLVED,
          resolvedAt: new Date(),
        }),
      );

      const result = await service.acknowledge('checkin-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.RESOLVED);
      expect(result.resolvedAt).toBeDefined();
    });

    it('should resolve an escalated check-in', async () => {
      setupEscalatedCheckIn();
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({
          status: CheckInStatus.RESOLVED,
          resolvedAt: new Date(),
        }),
      );

      const result = await service.acknowledge('checkin-1', 'user-1');
      expect(result.status).toBe(CheckInStatus.RESOLVED);
    });

    it('should throw NotFoundException when check-in not found', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await expect(
        service.acknowledge('checkin-999', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when already completed', async () => {
      setupCompletedCheckIn();
      await expect(service.acknowledge('checkin-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should send notification on acknowledge', async () => {
      setupActiveCheckIn();
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.RESOLVED }),
      );

      await service.acknowledge('checkin-1', 'user-1');
      expect(notificationsService.sendPushToUser).toHaveBeenCalledWith(
        'user-1',
        'Safety Confirmed',
        expect.any(String),
        NotificationType.BOOKING_CONFIRMED,
        expect.objectContaining({ checkInId: 'checkin-1' }),
      );
    });
  });

  describe('escalateMissedCheckout', () => {
    it('should escalate an active check-in', async () => {
      setupActiveCheckIn();
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({
          status: CheckInStatus.ESCALATED,
          escalatedAt: new Date(),
        }),
      );

      await service.escalateMissedCheckout('checkin-1');
      expect(checkInRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CheckInStatus.ESCALATED,
          escalatedAt: expect.any(Date),
        }),
      );
    });

    it('should skip escalation if check-in not found', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await service.escalateMissedCheckout('checkin-999');
      expect(checkInRepo.save).not.toHaveBeenCalled();
    });

    it('should skip escalation if already completed', async () => {
      setupCompletedCheckIn();
      await service.escalateMissedCheckout('checkin-1');
      expect(checkInRepo.save).not.toHaveBeenCalled();
    });

    it('should send push notification on escalation', async () => {
      setupActiveCheckIn();
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.ESCALATED }),
      );

      await service.escalateMissedCheckout('checkin-1');
      expect(notificationsService.sendPushToUser).toHaveBeenCalled();
    });
  });

  describe('escalateEmergency', () => {
    it('should log emergency for unresolved check-in', async () => {
      setupActiveCheckIn();
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);

      await service.escalateEmergency('checkin-1');
      expect(emergencyContactRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPrimary: true },
      });
    });

    it('should skip if check-in is already resolved', async () => {
      setupResolvedCheckIn();
      await service.escalateEmergency('checkin-1');
      expect(emergencyContactRepo.findOne).not.toHaveBeenCalled();
    });

    it('should skip if check-in is already completed', async () => {
      setupCompletedCheckIn();
      await service.escalateEmergency('checkin-1');
      expect(emergencyContactRepo.findOne).not.toHaveBeenCalled();
    });

    it('should handle missing check-in gracefully', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await service.escalateEmergency('checkin-999');
      expect(emergencyContactRepo.findOne).not.toHaveBeenCalled();
    });

    it('should handle missing emergency contact gracefully', async () => {
      setupActiveCheckIn();
      emergencyContactRepo.findOne.mockResolvedValue(null);

      await service.escalateEmergency('checkin-1');
      expect(notificationsService.sendPushToUser).not.toHaveBeenCalled();
    });
  });

  describe('resolveEscalation', () => {
    it('should resolve a check-in', async () => {
      setupActiveCheckIn();
      checkInRepo.save.mockResolvedValue(
        createMockCheckIn({ status: CheckInStatus.RESOLVED }),
      );

      await service.resolveEscalation('checkin-1');
      expect(checkInRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CheckInStatus.RESOLVED }),
      );
    });

    it('should throw NotFoundException for missing check-in', async () => {
      checkInRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveEscalation('checkin-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPrimaryContact', () => {
    it('should return primary contact', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(mockContact);
      const result = await service.getPrimaryContact('user-1');
      expect(result).toEqual(mockContact);
    });

    it('should return null when no primary contact exists', async () => {
      emergencyContactRepo.findOne.mockResolvedValue(null);
      const result = await service.getPrimaryContact('user-1');
      expect(result).toBeNull();
    });
  });
});
