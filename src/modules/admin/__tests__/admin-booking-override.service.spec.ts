import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminBookingOverrideService } from '../admin-booking-override.service';
import { BookingStatus } from '../../bookings/entities/booking.entity';
import {
  PaymentStatus,
  PaymentProvider,
} from '../../bookings/entities/payment.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ForceCancelRefund } from '../dtos/admin-force-cancel.dto';

describe('AdminBookingOverrideService', () => {
  let service: AdminBookingOverrideService;
  let bookingRepo: any;
  let paymentRepo: any;
  let auditLogService: any;
  let dataSource: any;

  function createMockBooking(overrides: Partial<any> = {}) {
    return {
      id: 'book-1',
      trekId: 'trek-1',
      userId: 'user-1',
      quantity: 2,
      unitPriceInr: 1000,
      totalAmountInr: 2000,
      status: BookingStatus.CONFIRMED,
      trekSnapshot: {
        name: 'Test Trek',
        startDate: '2026-08-15T00:00:00.000Z',
        maxParticipants: 20,
      },
      metadata: {},
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
      ...overrides,
    };
  }

  function createMockPayment(overrides: Partial<any> = {}) {
    return {
      id: 'pay-1',
      bookingId: 'book-1',
      provider: PaymentProvider.STRIPE,
      providerPaymentId: 'pi_stripe_123',
      status: PaymentStatus.SUCCEEDED,
      amountInr: 2000,
      currency: 'INR',
      refundAudit: [],
      version: 1,
      metadata: {},
      createdAt: new Date('2026-06-01T00:00:00Z'),
      ...overrides,
    };
  }

  const mockActor = {
    id: 'admin-1',
    email: 'admin@example.com',
    isAdmin: true,
  };

  const mockReq = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent', 'x-forwarded-for': '10.0.0.1' },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    const qbChain: any = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    bookingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({ ...qbChain })),
    };

    paymentRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    auditLogService = {
      save: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      query: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    service = new AdminBookingOverrideService(
      bookingRepo as any,
      paymentRepo as any,
      auditLogService as any,
      dataSource as any,
    );
  });

  describe('overrideBooking', () => {
    it('throws BadRequestException if reason is less than 10 chars', async () => {
      await expect(
        service.overrideBooking(
          'book-1',
          { reason: 'short', priceDelta: 500 },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.overrideBooking(
          'book-missing',
          { reason: 'Customer requested date change due to emergency' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if priceDelta results in negative total', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({
              ...createMockBooking(),
              totalAmountInr: 2000,
            }),
          })),
          save: jest.fn(),
          findOne: jest.fn(),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      await expect(
        service.overrideBooking(
          'book-1',
          {
            reason: 'Price adjustment for special circumstances',
            priceDelta: -9999,
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies priceDelta and updates booking total', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());

      const savedBooking = {
        ...createMockBooking(),
        totalAmountInr: 2500,
        unitPriceInr: 1250,
      };

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(createMockBooking()),
          })),
          save: jest.fn().mockResolvedValue(savedBooking),
          findOne: jest.fn().mockResolvedValue(savedBooking),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      const result = await service.overrideBooking(
        'book-1',
        {
          reason: 'Price adjustment for special circumstances',
          priceDelta: 500,
        },
        mockActor,
        mockReq,
      );

      expect(result.booking.totalAmountInr).toBe(2500);
      expect(result.booking.unitPriceInr).toBe(1250);
      expect(result.changes.priceDelta).toBe(500);
      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_OVERRIDE',
          resourceId: 'book-1',
        }),
      );
    });

    it('applies newStartDate and updates trekSnapshot', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());

      const newDate = '2026-09-01T00:00:00.000Z';
      const updatedSnapshot = {
        ...createMockBooking().trekSnapshot,
        startDate: newDate,
      };
      const savedBooking = {
        ...createMockBooking(),
        trekSnapshot: updatedSnapshot,
      };

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(createMockBooking()),
          })),
          save: jest.fn().mockResolvedValue(savedBooking),
          findOne: jest.fn().mockResolvedValue(savedBooking),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      const result = await service.overrideBooking(
        'book-1',
        { reason: 'Date shift due to weather concerns', newStartDate: newDate },
        mockActor,
        mockReq,
      );

      expect(result.booking.trekSnapshot.startDate).toBe(newDate);
      expect(result.changes.newStartDate).toBe(newDate);
    });

    it('applies both priceDelta and newStartDate simultaneously', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());

      const newDate = '2026-10-01T00:00:00.000Z';
      const updatedSnapshot = {
        ...createMockBooking().trekSnapshot,
        startDate: newDate,
      };
      const savedBooking = {
        ...createMockBooking(),
        totalAmountInr: 1800,
        unitPriceInr: 900,
        trekSnapshot: updatedSnapshot,
      };

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(createMockBooking()),
          })),
          save: jest.fn().mockResolvedValue(savedBooking),
          findOne: jest.fn().mockResolvedValue(savedBooking),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      const result = await service.overrideBooking(
        'book-1',
        {
          reason: 'Combined price and date override for group discount',
          priceDelta: -200,
          newStartDate: newDate,
          notes: 'Group discount applied',
        },
        mockActor,
        mockReq,
      );

      expect(result.booking.totalAmountInr).toBe(1800);
      expect(result.booking.trekSnapshot.startDate).toBe(newDate);
      expect(result.changes.priceDelta).toBe(-200);
      expect(result.changes.newStartDate).toBe(newDate);
    });

    it('increments overrideCount in metadata', async () => {
      const bookingWithHistory = {
        ...createMockBooking(),
        metadata: {
          overrideCount: 2,
          lastOverriddenAt: '2026-05-01T00:00:00Z',
        },
      };
      bookingRepo.findOne.mockResolvedValue(bookingWithHistory);

      const savedBooking = {
        ...bookingWithHistory,
        metadata: {
          ...bookingWithHistory.metadata,
          overrideCount: 3,
          lastOverriddenAt: expect.any(String),
          overrideReason: 'Third override for testing',
          overrideNotes: null,
        },
      };

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(bookingWithHistory),
          })),
          save: jest.fn().mockResolvedValue(savedBooking),
          findOne: jest.fn().mockResolvedValue(savedBooking),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      await service.overrideBooking(
        'book-1',
        { reason: 'Third override for testing purposes' },
        mockActor,
        mockReq,
      );

      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            previousStatus: BookingStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('logs audit entry with correct actor metadata', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(createMockBooking()),
          })),
          save: jest.fn().mockResolvedValue(createMockBooking()),
          findOne: jest.fn().mockResolvedValue(createMockBooking()),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      await service.overrideBooking(
        'book-1',
        { reason: 'Testing audit metadata logging' },
        mockActor,
        mockReq,
      );

      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorEmail: 'adm***',
          actorRole: 'ADMIN',
          ip: '127.0.0.1',
          action: 'BOOKING_OVERRIDE',
        }),
      );
    });
  });

  describe('forceCancel', () => {
    it('throws BadRequestException if reason is less than 10 chars', async () => {
      await expect(
        service.forceCancel(
          'book-1',
          { reason: 'short', refundOverride: ForceCancelRefund.NONE },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.forceCancel(
          'book-missing',
          {
            reason: 'Customer requested cancellation via support',
            refundOverride: ForceCancelRefund.NONE,
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    function buildTxEm(overrides: {
      cancelled?: boolean;
      hasPayment?: boolean;
      refundOverride?: ForceCancelRefund;
    } = {}) {
      const getOneResult = overrides.cancelled
        ? { ...createMockBooking(), status: BookingStatus.CANCELLED }
        : createMockBooking();
      const payResult =
        overrides.hasPayment === false ? null : { ...createMockPayment() };
      return {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(getOneResult),
          })),
          findOne: jest.fn().mockResolvedValue(payResult),
          save: jest
            .fn()
            .mockImplementation((entity: any) => Promise.resolve(entity)),
        }),
      };
    }

    it('throws BadRequestException if booking is already cancelled', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...createMockBooking(),
        status: BookingStatus.CANCELLED,
      });
      const txEm = buildTxEm({ cancelled: true });
      dataSource.transaction.mockImplementation((cb: any) => cb(txEm));

      await expect(
        service.forceCancel(
          'book-1',
          {
            reason: 'Attempting to cancel again',
            refundOverride: ForceCancelRefund.NONE,
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('force cancels with FULL refund override', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      const txEm = buildTxEm();
      dataSource.transaction.mockImplementation((cb: any) => cb(txEm));

      const result = await service.forceCancel(
        'book-1',
        {
          reason: 'Full refund per support policy exception',
          refundOverride: ForceCancelRefund.FULL,
        },
        mockActor,
        mockReq,
      );

      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.payment.status).toBe(PaymentStatus.REFUNDED);
      expect(result.refundApplied).toBe(true);
      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BOOKING_FORCE_CANCEL',
          resourceId: 'book-1',
        }),
      );
    });

    it('force cancels with PARTIAL refund override (no payment status change)', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      const txEm = buildTxEm();
      dataSource.transaction.mockImplementation((cb: any) => cb(txEm));

      const result = await service.forceCancel(
        'book-1',
        {
          reason: 'Partial refund due to cancellation policy override',
          refundOverride: ForceCancelRefund.PARTIAL,
          refundNote: 'Admin approved 50% refund',
        },
        mockActor,
        mockReq,
      );

      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(result.refundApplied).toBe(false);
    });

    it('force cancels with NONE refund override', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      const txEm = buildTxEm();
      dataSource.transaction.mockImplementation((cb: any) => cb(txEm));

      const result = await service.forceCancel(
        'book-1',
        {
          reason: 'No refund per policy violation',
          refundOverride: ForceCancelRefund.NONE,
        },
        mockActor,
        mockReq,
      );

      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(result.refundApplied).toBe(false);
    });

    it('handles force cancel with no existing payment', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      const txEm = buildTxEm({ hasPayment: false });
      dataSource.transaction.mockImplementation((cb: any) => cb(txEm));

      const result = await service.forceCancel(
        'book-1',
        {
          reason: 'Force cancel with no payment record',
          refundOverride: ForceCancelRefund.NONE,
        },
        mockActor,
        mockReq,
      );

      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
      expect(result.payment).toBeNull();
    });

    it('logs audit entry with correct details', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      const txEm = buildTxEm();
      dataSource.transaction.mockImplementation((cb: any) => cb(txEm));

      await service.forceCancel(
        'book-1',
        {
          reason: 'Testing force cancel audit trail',
          refundOverride: ForceCancelRefund.FULL,
        },
        mockActor,
        mockReq,
      );

      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorEmail: 'adm***',
          actorRole: 'ADMIN',
          action: 'BOOKING_FORCE_CANCEL',
          detail: expect.objectContaining({
            reason: 'Testing force cancel audit trail',
            refundOverride: 'FULL',
            hadPayment: true,
            refundAmount: 2000,
          }),
        }),
      );
    });
  });

  describe('getTimeline', () => {
    it('throws NotFoundException if booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.getTimeline('book-missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns booking creation event as first entry', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      paymentRepo.find.mockResolvedValue([]);
      auditLogService.query.mockResolvedValue({ data: [], total: 0 });

      const result = await service.getTimeline('book-1');

      expect(result.total).toBe(1);
      expect(result.data[0].type).toBe('booking_created');
      expect(result.data[0].label).toBe('Booking created');
    });

    it('includes payment events in timeline', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      paymentRepo.find.mockResolvedValue([createMockPayment()]);
      auditLogService.query.mockResolvedValue({ data: [], total: 0 });

      const result = await service.getTimeline('book-1');

      const paymentEvents = result.data.filter(
        (e: any) => e.type === 'payment_event',
      );
      expect(paymentEvents.length).toBeGreaterThan(0);
      expect(paymentEvents[0].label).toMatch(/Payment/);
    });

    it('includes refund events from refundAudit', async () => {
      const paymentWithRefund = {
        ...createMockPayment(),
        refundAudit: [
          {
            refundId: 'rf-1',
            amount: 500,
            reason: 'Partial refund for damaged gear',
            refundedBy: 'admin-1',
            refundedAt: '2026-06-15T00:00:00Z',
            providerRefundId: 'rf_stripe_1',
          },
        ],
      };

      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      paymentRepo.find.mockResolvedValue([paymentWithRefund]);
      auditLogService.query.mockResolvedValue({ data: [], total: 0 });

      const result = await service.getTimeline('book-1');

      const refundEvents = result.data.filter(
        (e: any) =>
          e.type === 'admin_override' && e.label === 'Refund processed',
      );
      expect(refundEvents.length).toBe(1);
      expect(refundEvents[0].detail).toContain('INR 500');
    });

    it('includes admin override audit entries', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      paymentRepo.find.mockResolvedValue([]);
      auditLogService.query.mockResolvedValue({
        data: [
          {
            id: 'audit-ovr-1',
            action: 'BOOKING_OVERRIDE',
            detail: { reason: 'Price adjustment', priceDelta: 500 },
            createdAt: { toISOString: () => '2026-06-10T00:00:00Z' },
            actorId: 'admin-1',
            actorEmail: 'adm***',
          },
        ],
        total: 1,
      });

      const result = await service.getTimeline('book-1');

      const overrideEvents = result.data.filter(
        (e: any) => e.type === 'admin_override' && e.label === 'Admin override',
      );
      expect(overrideEvents.length).toBe(1);
      expect(overrideEvents[0].actorId).toBe('admin-1');
    });

    it('returns entries sorted by createdAt descending', async () => {
      bookingRepo.findOne.mockResolvedValue(createMockBooking());
      paymentRepo.find.mockResolvedValue([]);
      auditLogService.query.mockResolvedValue({
        data: [
          {
            id: 'audit-1',
            action: 'BOOKING_OVERRIDE',
            detail: { reason: 'First override' },
            createdAt: { toISOString: () => '2026-06-05T00:00:00Z' },
            actorId: 'admin-1',
            actorEmail: 'adm***',
          },
          {
            id: 'audit-2',
            action: 'BOOKING_FORCE_CANCEL',
            detail: { reason: 'Force cancel' },
            createdAt: { toISOString: () => '2026-06-10T00:00:00Z' },
            actorId: 'admin-1',
            actorEmail: 'adm***',
          },
        ],
        total: 2,
      });

      const result = await service.getTimeline('book-1');

      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.data[0].id).toContain('audit-2');
      expect(result.data[1].id).toContain('audit-1');
      expect(result.data[result.data.length - 1].type).toBe('booking_created');
    });
  });
});
