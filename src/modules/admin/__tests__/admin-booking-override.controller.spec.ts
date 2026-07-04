import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminBookingOverrideController } from '../admin-booking-override.controller';
import { BookingStatus } from '../../bookings/entities/booking.entity';
import { ForceCancelRefund } from '../dtos/admin-force-cancel.dto';

describe('AdminBookingOverrideController', () => {
  let controller: AdminBookingOverrideController;
  let service: any;

  const mockActor = { id: 'admin-1', email: 'admin@test.com', isAdmin: true };

  beforeEach(() => {
    service = {
      overrideBooking: jest.fn().mockResolvedValue({
        booking: {
          id: 'book-1',
          status: BookingStatus.CONFIRMED,
          totalAmountInr: 2500,
        },
        changes: { priceDelta: 500, newTotal: 2500 },
      }),
      forceCancel: jest.fn().mockResolvedValue({
        booking: { id: 'book-1', status: BookingStatus.CANCELLED },
        payment: {
          id: 'pay-1',
          status: 'REFUNDED',
          amountInr: 2000,
          refundAmount: 2000,
        },
        refundApplied: true,
      }),
      getTimeline: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'event-1',
            type: 'booking_created',
            label: 'Booking created',
            createdAt: '2026-06-01T00:00:00Z',
          },
        ],
        total: 1,
        bookingId: 'book-1',
      }),
    };

    controller = new AdminBookingOverrideController(service);
  });

  describe('overrideBooking', () => {
    it('delegates to service with booking ID, DTO, user, and request', async () => {
      const req = { user: mockActor, ip: '127.0.0.1', headers: {} };
      const body = {
        priceDelta: 500,
        reason: 'Price adjustment for special circumstances',
        notes: 'VIP discount applied',
      };

      const result = await controller.overrideBooking('book-1', body, req);

      expect(service.overrideBooking).toHaveBeenCalledWith(
        'book-1',
        body,
        mockActor,
        req,
      );
      expect(result.booking.totalAmountInr).toBe(2500);
    });

    it('handles date-only override without priceDelta', async () => {
      const req = { user: mockActor, ip: '::1', headers: {} };
      const body = {
        newStartDate: '2026-09-01T00:00:00.000Z',
        reason: 'Date shift due to weather concerns',
      };

      const result = await controller.overrideBooking('book-1', body, req);

      expect(service.overrideBooking).toHaveBeenCalledWith(
        'book-1',
        body,
        mockActor,
        req,
      );
      expect(result.booking.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('forceCancel', () => {
    it('delegates to service with booking ID, DTO, user, and request', async () => {
      const req = { user: mockActor, ip: '10.0.0.1', headers: {} };
      const body = {
        reason: 'Full refund per support policy exception',
        refundOverride: ForceCancelRefund.FULL,
      };

      const result = await controller.forceCancel('book-1', body, req);

      expect(service.forceCancel).toHaveBeenCalledWith(
        'book-1',
        body,
        mockActor,
        req,
      );
      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.refundApplied).toBe(true);
    });

    it('handles no-refund cancellation', async () => {
      service.forceCancel = jest.fn().mockResolvedValue({
        booking: { id: 'book-1', status: BookingStatus.CANCELLED },
        payment: null,
        refundApplied: false,
      });

      const req = { user: mockActor, ip: '10.0.0.1', headers: {} };
      const body = {
        reason: 'No refund per policy violation',
        refundOverride: ForceCancelRefund.NONE,
      };

      const result = await controller.forceCancel('book-1', body, req);

      expect(service.forceCancel).toHaveBeenCalledWith(
        'book-1',
        body,
        mockActor,
        req,
      );
      expect(result.refundApplied).toBe(false);
      expect(result.payment).toBeNull();
    });
  });

  describe('getTimeline', () => {
    it('delegates to service with booking ID', async () => {
      const result = await controller.getTimeline('book-1');

      expect(service.getTimeline).toHaveBeenCalledWith('book-1');
      expect(result.data).toHaveLength(1);
      expect(result.bookingId).toBe('book-1');
    });
  });
});
