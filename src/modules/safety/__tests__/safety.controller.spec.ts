import { Test, type TestingModule } from '@nestjs/testing';
import { SafetyController } from '../safety.controller';
import { SafetyService } from '../safety.service';

describe('SafetyController', () => {
  let controller: SafetyController;
  let service: jest.Mocked<SafetyService>;

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    isAdmin: false,
  };

  const mockContact = {
    id: 'contact-1',
    userId: 'user-1',
    name: 'Emergency Person',
    phone: '+911234567890',
    relationship: 'Spouse',
    isPrimary: true,
  };

  const mockCheckIn = {
    id: 'checkin-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    status: 'ACTIVE',
    checkedInAt: new Date(),
  };

  const mockSafetyInfo = {
    id: 'safety-1',
    trekId: 'trek-1',
    terrainRisks: 'Steep sections',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SafetyController],
      providers: [
        {
          provide: SafetyService,
          useValue: {
            getTrekSafety: jest.fn(),
            upsertTrekSafety: jest.fn(),
            getUserContacts: jest.fn(),
            addContact: jest.fn(),
            updateContact: jest.fn(),
            deleteContact: jest.fn(),
            checkIn: jest.fn(),
            checkOut: jest.fn(),
            getCheckInStatus: jest.fn(),
            acknowledge: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SafetyController>(SafetyController);
    service = module.get(SafetyService);
  });

  describe('GET /treks/:trekId/safety', () => {
    it('should return trek safety info', async () => {
      service.getTrekSafety.mockResolvedValue(mockSafetyInfo as any);
      const result = await controller.getTrekSafety('trek-1');
      expect(result).toEqual(mockSafetyInfo);
      expect(service.getTrekSafety).toHaveBeenCalledWith('trek-1');
    });

    it('should return null when no safety info exists', async () => {
      service.getTrekSafety.mockResolvedValue(null);
      const result = await controller.getTrekSafety('trek-1');
      expect(result).toBeNull();
    });
  });

  describe('PUT /treks/:trekId/safety', () => {
    it('should upsert safety info', async () => {
      const dto = { terrainRisks: 'Loose rocks' };
      service.upsertTrekSafety.mockResolvedValue(mockSafetyInfo as any);
      const result = await controller.upsertTrekSafety(
        'trek-1',
        mockUser as any,
        dto,
      );
      expect(result).toEqual(mockSafetyInfo);
      expect(service.upsertTrekSafety).toHaveBeenCalledWith(
        'trek-1',
        'user-1',
        dto,
      );
    });
  });

  describe('GET /profile/emergency-contacts', () => {
    it('should return user contacts', async () => {
      service.getUserContacts.mockResolvedValue([mockContact] as any);
      const result = await controller.getEmergencyContacts(mockUser as any);
      expect(result).toEqual([mockContact]);
      expect(service.getUserContacts).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when no contacts', async () => {
      service.getUserContacts.mockResolvedValue([]);
      const result = await controller.getEmergencyContacts(mockUser as any);
      expect(result).toEqual([]);
    });
  });

  describe('POST /profile/emergency-contacts', () => {
    it('should create emergency contact', async () => {
      const dto = {
        name: 'Test',
        phone: '+911234567890',
        relationship: 'Friend',
      };
      service.addContact.mockResolvedValue(mockContact as any);
      const result = await controller.addEmergencyContact(mockUser as any, dto);
      expect(result).toEqual(mockContact);
      expect(service.addContact).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('PATCH /profile/emergency-contacts/:id', () => {
    it('should update emergency contact', async () => {
      const dto = { name: 'Updated' };
      service.updateContact.mockResolvedValue({
        ...mockContact,
        name: 'Updated',
      } as any);
      const result = await controller.updateEmergencyContact(
        'contact-1',
        mockUser as any,
        dto,
      );
      expect(result.name).toBe('Updated');
      expect(service.updateContact).toHaveBeenCalledWith(
        'contact-1',
        'user-1',
        dto,
      );
    });
  });

  describe('DELETE /profile/emergency-contacts/:id', () => {
    it('should delete emergency contact', async () => {
      await controller.deleteEmergencyContact('contact-1', mockUser as any);
      expect(service.deleteContact).toHaveBeenCalledWith('contact-1', 'user-1');
    });
  });

  describe('POST /bookings/:bookingId/check-in', () => {
    it('should check in', async () => {
      const dto = { latitude: 27.5, longitude: 78.0 };
      service.checkIn.mockResolvedValue(mockCheckIn as any);
      const result = await controller.checkIn(
        'booking-1',
        mockUser as any,
        dto,
      );
      expect(result).toEqual(mockCheckIn);
      expect(service.checkIn).toHaveBeenCalledWith('booking-1', 'user-1', dto);
    });
  });

  describe('POST /bookings/:bookingId/check-out', () => {
    it('should check out without location', async () => {
      const dto = {};
      service.checkOut.mockResolvedValue({
        ...mockCheckIn,
        status: 'COMPLETED',
      } as any);
      const result = await controller.checkOut(
        'booking-1',
        mockUser as any,
        dto,
      );
      expect(result.status).toBe('COMPLETED');
      expect(service.checkOut).toHaveBeenCalledWith('booking-1', 'user-1', dto);
    });

    it('should check out with location', async () => {
      const dto = { latitude: 27.5, longitude: 78.0 };
      service.checkOut.mockResolvedValue({
        ...mockCheckIn,
        status: 'COMPLETED',
      } as any);
      await controller.checkOut('booking-1', mockUser as any, dto);
      expect(service.checkOut).toHaveBeenCalledWith('booking-1', 'user-1', dto);
    });
  });

  describe('GET /bookings/:bookingId/check-in-status', () => {
    it('should return check-in status', async () => {
      service.getCheckInStatus.mockResolvedValue(mockCheckIn as any);
      const result = await controller.getCheckInStatus(
        'booking-1',
        mockUser as any,
      );
      expect(result).toEqual(mockCheckIn);
      expect(service.getCheckInStatus).toHaveBeenCalledWith(
        'booking-1',
        'user-1',
      );
    });

    it('should return null when not checked in', async () => {
      service.getCheckInStatus.mockResolvedValue(null);
      const result = await controller.getCheckInStatus(
        'booking-1',
        mockUser as any,
      );
      expect(result).toBeNull();
    });
  });

  describe('POST /check-in/:checkInId/acknowledge', () => {
    it('should acknowledge safety', async () => {
      service.acknowledge.mockResolvedValue({
        ...mockCheckIn,
        status: 'RESOLVED',
      } as any);
      const result = await controller.acknowledge(
        'checkin-1',
        mockUser as any,
        {},
      );
      expect(result.status).toBe('RESOLVED');
      expect(service.acknowledge).toHaveBeenCalledWith('checkin-1', 'user-1');
    });
  });
});
