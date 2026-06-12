import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { BookingsService } from '../bookings.service';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { TicketService } from '../ticket.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let paymentRepo: jest.Mocked<Repository<Payment>>;
  let dataSource: jest.Mocked<DataSource>;
  let ticketService: jest.Mocked<TicketService>;

  const mockTrek = {
    id: 'trek-1',
    name: 'Test Trek',
    costInr: 1000,
    maxParticipants: 10,
    isPublished: true,
    startDate: new Date(),
    organizer: { id: 'org-1' },
  } as any;

  const mockBooking = {
    id: 'booking-1',
    trekId: 'trek-1',
    userId: 'user-1',
    quantity: 2,
    unitPriceInr: 1000,
    totalAmountInr: 2000,
    status: BookingStatus.PENDING,
    trekSnapshot: { id: 'trek-1', name: 'Test Trek' },
    holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    metadata: {},
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const queryBuilderMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    bookingRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    } as any;

    trekRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    } as any;

    paymentRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    ticketService = {
      generateSignedTicket: jest.fn(),
      verifyToken: jest.fn(),
    } as any;

    // Mock DataSource.transaction
    dataSource = {
      transaction: jest.fn(),
    } as any;

    const settingsService = {
      getSettings: jest.fn().mockResolvedValue({ holdWindowMinutes: 15 }),
    } as any;

    service = new BookingsService(
      bookingRepo as any,
      trekRepo as any,
      paymentRepo as any,
      settingsService,
      ticketService as any,
      dataSource as any,
    );
  });

  describe('findByUser', () => {
    it('should return paginated bookings for a user', async () => {
      bookingRepo.findAndCount.mockResolvedValue([[mockBooking], 1]);

      const result = await service.findByUser('user-1', { page: 1, limit: 10 });

      expect(result.data).toEqual([mockBooking]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(bookingRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return booking for owner', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      const result = await service.findOne('booking-1', 'user-1');

      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException if booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner nor organizer', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      trekRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('booking-1', 'stranger')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a confirmed booking', async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      };
      bookingRepo.findOne.mockResolvedValue(confirmedBooking);
      paymentRepo.findOne.mockResolvedValue(null);
      bookingRepo.save.mockResolvedValue(confirmedBooking);

      const result = await service.cancelBooking('booking-1', 'user-1');

      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.refunded).toBe(false);
    });

    it('should cancel and trigger refund if payment exists', async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      };
      const mockPayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        status: PaymentStatus.SUCCEEDED,
      };
      bookingRepo.findOne.mockResolvedValue(confirmedBooking);
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      bookingRepo.save.mockResolvedValue({ ...confirmedBooking, status: BookingStatus.CANCELLED });
      paymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.REFUNDED });

      const result = await service.cancelBooking('booking-1', 'user-1');

      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.refunded).toBe(true);
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.REFUNDED }),
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      await expect(
        service.cancelBooking('booking-1', 'stranger'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking already cancelled', async () => {
      const cancelledBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      };
      bookingRepo.findOne.mockResolvedValue(cancelledBooking);

      await expect(
        service.cancelBooking('booking-1', 'user-1'),
      ).rejects.toThrow('Booking cannot be cancelled');
    });
  });

  describe('verifyQrToken', () => {
    it('should return valid booking for correct token', async () => {
      ticketService.verifyToken.mockResolvedValue({
        bookingId: 'booking-1',
        userId: 'user-1',
      });
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      const result = await service.verifyQrToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.booking).toBeDefined();
    });

    it('should return invalid for bad token', async () => {
      ticketService.verifyToken.mockRejectedValue(new Error('Invalid'));

      const result = await service.verifyQrToken('bad-token');

      expect(result.valid).toBe(false);
      expect(result.booking).toBeNull();
    });
  });

  describe('releaseExpiredHolds', () => {
    let qb: any;

    beforeEach(() => {
      qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      (bookingRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    });

    it('should release expired pending bookings', async () => {
      const expiredBooking = { id: 'expired-1', status: BookingStatus.PENDING };
      qb.getMany.mockResolvedValue([expiredBooking]);
      bookingRepo.save.mockResolvedValue(expiredBooking);

      const result = await service.releaseExpiredHolds();

      expect(result.released).toBe(1);
    });

    it('should return 0 released if no expired bookings', async () => {
      qb.getMany.mockResolvedValue([]);

      const result = await service.releaseExpiredHolds();

      expect(result.released).toBe(0);
    });
  });
});
