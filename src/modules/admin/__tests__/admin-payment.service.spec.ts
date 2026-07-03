import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminPaymentService } from '../admin-payment.service';
import {
  PaymentStatus,
  PaymentProvider,
} from '../../bookings/entities/payment.entity';
import { BookingStatus } from '../../bookings/entities/booking.entity';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('AdminPaymentService', () => {
  let service: AdminPaymentService;
  let paymentRepo: any;
  let bookingRepo: any;
  let userRepo: any;
  let gatewayRegistry: any;
  let auditLogService: any;
  let dataSource: any;

  const mockPayment = {
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
  };

  const mockBooking = {
    id: 'book-1',
    trekId: 'trek-1',
    userId: 'user-1',
    quantity: 2,
    totalAmountInr: 2000,
    status: BookingStatus.CONFIRMED,
    metadata: {},
  };

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
    const qbChain: any = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
    };

    paymentRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({ ...qbChain })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    bookingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    userRepo = {};

    gatewayRegistry = {
      getGateway: jest.fn(),
      getAllGateways: jest.fn(),
    };

    auditLogService = {
      save: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    service = new AdminPaymentService(
      paymentRepo as any,
      bookingRepo as any,
      userRepo as any,
      gatewayRegistry as any,
      auditLogService as any,
      dataSource as any,
    );
  });

  describe('searchPayments', () => {
    it('returns paginated payments with default pagination', async () => {
      const result = await service.searchPayments({});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(paymentRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('applies bookingId filter', async () => {
      await service.searchPayments({ bookingId: 'book-42' });

      const qb = paymentRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.bookingId = :bookingId',
        { bookingId: 'book-42' },
      );
    });

    it('applies provider filter', async () => {
      await service.searchPayments({ provider: 'STRIPE' });

      const qb = paymentRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.provider = :provider',
        { provider: 'STRIPE' },
      );
    });

    it('applies status filter', async () => {
      await service.searchPayments({ status: 'REFUNDED' });

      const qb = paymentRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.status = :status',
        { status: 'REFUNDED' },
      );
    });

    it('applies date range filters', async () => {
      await service.searchPayments({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      const qb = paymentRepo.createQueryBuilder();
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.createdAt >= :start',
        { start: '2024-01-01' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.createdAt <= :end',
        { end: '2024-12-31' },
      );
    });

    it('returns empty array when no payments match', async () => {
      paymentRepo.createQueryBuilder = jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }));

      const result = await service.searchPayments({});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('refundPayment', () => {
    it('throws BadRequestException if reason is less than 10 chars', async () => {
      await expect(
        service.refundPayment(
          'pay-1',
          { amount: 500, reason: 'short' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if payment does not exist', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.refundPayment(
          'pay-missing',
          { amount: 500, reason: 'Customer requested refund' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if payment is not succeeded', async () => {
      paymentRepo.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.CREATED,
      });

      await expect(
        service.refundPayment(
          'pay-1',
          { amount: 500, reason: 'Customer requested refund' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if refund amount exceeds payment amount', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      await expect(
        service.refundPayment(
          'pay-1',
          { amount: 9999, reason: 'Customer requested refund' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on version mismatch (optimistic locking)', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({
            ...mockPayment,
            version: 2,
          }),
          update: jest.fn(),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      gatewayRegistry.getGateway.mockReturnValue({
        refundPayment: jest.fn().mockResolvedValue({
          providerRefundId: 'rf_123',
          status: 'succeeded',
        }),
      });

      await expect(
        service.refundPayment(
          'pay-1',
          { amount: 500, reason: 'Customer requested refund' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('processes a partial refund successfully', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });
      const mockFindOne = jest
        .fn()
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce({
          ...mockPayment,
          version: 1,
          refundAudit: [
            {
              refundId: 'rf-1',
              amount: 500,
              reason: 'Partial refund',
              refundedBy: 'admin-1',
              refundedAt: new Date().toISOString(),
              providerRefundId: 'rf_stripe_1',
            },
          ],
          status: PaymentStatus.SUCCEEDED,
        });

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          update: mockUpdate,
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      gatewayRegistry.getGateway.mockReturnValue({
        refundPayment: jest.fn().mockResolvedValue({
          providerRefundId: 'rf_stripe_1',
          status: 'succeeded',
        }),
      });

      const result = await service.refundPayment(
        'pay-1',
        { amount: 500, reason: 'Partial refund requested' },
        mockActor,
        mockReq,
      );

      expect(result.refundEntry.amount).toBe(500);
      expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(mockUpdate).toHaveBeenCalled();
      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_PARTIAL_REFUND',
          resourceId: 'pay-1',
        }),
      );
    });

    it('processes a full refund and cancels booking', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });
      const mockFindOne = jest
        .fn()
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce({
          ...mockPayment,
          version: 1,
          refundAudit: [
            {
              refundId: 'rf-2',
              amount: 2000,
              reason: 'Full refund',
              refundedBy: 'admin-1',
              refundedAt: new Date().toISOString(),
              providerRefundId: 'rf_stripe_2',
            },
          ],
          status: PaymentStatus.REFUNDED,
        });

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          findOne: mockFindOne,
          update: mockUpdate,
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      gatewayRegistry.getGateway.mockReturnValue({
        refundPayment: jest.fn().mockResolvedValue({
          providerRefundId: 'rf_stripe_2',
          status: 'succeeded',
        }),
      });

      const result = await service.refundPayment(
        'pay-1',
        { amount: 2000, reason: 'Customer requested full refund' },
        mockActor,
        mockReq,
      );

      expect(result.refundEntry.amount).toBe(2000);
      expect(result.payment.status).toBe(PaymentStatus.REFUNDED);
      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_REFUND',
        }),
      );
    });

    it('handles provider refund failure gracefully', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockPayment),
          update: jest.fn(),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      gatewayRegistry.getGateway.mockReturnValue({
        refundPayment: jest
          .fn()
          .mockRejectedValue(new Error('Provider declined')),
      });

      await expect(
        service.refundPayment(
          'pay-1',
          { amount: 500, reason: 'Customer requested refund' },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('logs audit entry with correct actor metadata', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockPayment),
          update: jest.fn(),
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      gatewayRegistry.getGateway.mockReturnValue({
        refundPayment: jest.fn().mockResolvedValue({
          providerRefundId: 'rf_audit_test',
          status: 'succeeded',
        }),
      });

      await service.refundPayment(
        'pay-1',
        { amount: 2000, reason: 'Testing audit logging' },
        mockActor,
        mockReq,
      );

      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorEmail: 'adm***',
          actorRole: 'ADMIN',
          ip: '127.0.0.1',
        }),
      );
    });

    it('uses default refund amount when amount not specified', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const mockUpdate = jest.fn();
      const mockEm = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockPayment),
          update: mockUpdate,
        }),
      };
      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockEm),
      );

      gatewayRegistry.getGateway.mockReturnValue({
        refundPayment: jest.fn().mockResolvedValue({
          providerRefundId: 'rf_default',
          status: 'succeeded',
        }),
      });

      await service.refundPayment(
        'pay-1',
        { reason: 'Default amount refund' },
        mockActor,
        mockReq,
      );

      expect(gatewayRegistry.getGateway().refundPayment).toHaveBeenCalledWith(
        'pi_stripe_123',
        undefined,
      );
    });
  });

  describe('retryPayment', () => {
    it('throws NotFoundException if payment does not exist', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.retryPayment(
          'pay-missing',
          {
            provider: PaymentProvider.RAZORPAY,
            idempotencyKey: 'key-1',
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if payment is not failed', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      await expect(
        service.retryPayment(
          'pay-1',
          {
            provider: PaymentProvider.RAZORPAY,
            idempotencyKey: 'key-1',
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if retry uses same provider', async () => {
      paymentRepo.findOne
        .mockResolvedValueOnce({
          ...mockPayment,
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.STRIPE,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.retryPayment(
          'pay-1',
          {
            provider: PaymentProvider.STRIPE,
            idempotencyKey: 'key-1',
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing payment if idempotencyKey matches', async () => {
      paymentRepo.findOne.mockResolvedValueOnce({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      paymentRepo.findOne.mockResolvedValueOnce({
        id: 'pay-retry-1',
        status: PaymentStatus.CREATED,
      });

      const result = await service.retryPayment(
        'pay-1',
        {
          provider: PaymentProvider.RAZORPAY,
          idempotencyKey: 'dup-key',
        },
        mockActor,
        mockReq,
      );

      expect(result.duplicate).toBe(true);
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('creates a new payment with different provider and resets booking', async () => {
      paymentRepo.findOne.mockResolvedValueOnce({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      paymentRepo.findOne.mockResolvedValueOnce(null);
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      gatewayRegistry.getGateway.mockReturnValue({
        createPaymentIntent: jest.fn().mockResolvedValue({
          providerPaymentId: 'order_rzp_retry',
          rawResponse: { id: 'order_rzp_retry' },
        }),
      });

      paymentRepo.create.mockReturnValue({
        id: 'pay-retry-2',
        bookingId: 'book-1',
        provider: PaymentProvider.RAZORPAY,
      });
      paymentRepo.save.mockResolvedValue({});

      const result = await service.retryPayment(
        'pay-1',
        {
          provider: PaymentProvider.RAZORPAY,
          idempotencyKey: 'retry-key-1',
        },
        mockActor,
        mockReq,
      );

      expect(result.provider).toBe('RAZORPAY');
      expect(result.paymentId).toBe('pay-retry-2');
      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'book-1',
          provider: PaymentProvider.RAZORPAY,
          idempotencyKey: 'retry-key-1',
          metadata: expect.objectContaining({
            retryOf: 'pay-1',
            originalProvider: 'STRIPE',
          }),
        }),
      );
      expect(bookingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.PENDING }),
      );
    });

    it('throws BadRequestException when provider retry fails', async () => {
      paymentRepo.findOne.mockResolvedValueOnce({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      paymentRepo.findOne.mockResolvedValueOnce(null);
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      gatewayRegistry.getGateway.mockReturnValue({
        createPaymentIntent: jest
          .fn()
          .mockRejectedValue(new Error('Insufficient balance')),
      });

      await expect(
        service.retryPayment(
          'pay-1',
          {
            provider: PaymentProvider.RAZORPAY,
            idempotencyKey: 'retry-key-2',
          },
          mockActor,
          mockReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('logs audit entry for successful retry', async () => {
      paymentRepo.findOne.mockResolvedValueOnce({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      paymentRepo.findOne.mockResolvedValueOnce(null);
      bookingRepo.findOne.mockResolvedValue(mockBooking);

      gatewayRegistry.getGateway.mockReturnValue({
        createPaymentIntent: jest.fn().mockResolvedValue({
          providerPaymentId: 'order_audit_test',
          rawResponse: { id: 'order_audit_test' },
        }),
      });

      paymentRepo.create.mockReturnValue({ id: 'pay-retry-audit' });
      paymentRepo.save.mockResolvedValue({});

      await service.retryPayment(
        'pay-1',
        {
          provider: PaymentProvider.RAZORPAY,
          idempotencyKey: 'retry-audit-key',
        },
        mockActor,
        mockReq,
      );

      expect(auditLogService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_RETRY',
          resourceId: 'pay-1',
          detail: expect.objectContaining({
            newProvider: 'RAZORPAY',
            originalProvider: 'STRIPE',
          }),
        }),
      );
    });
  });

  describe('getDisputes', () => {
    it('aggregates disputes from all gateways', async () => {
      gatewayRegistry.getAllGateways.mockReturnValue([
        {
          getDisputes: jest.fn().mockResolvedValue([
            {
              id: 'dp_stripe_1',
              paymentIntentId: 'pi_1',
              amount: 2000,
              status: 'under_review',
              createdAt: '2024-06-01T00:00:00Z',
            },
          ]),
        },
        {
          getDisputes: jest.fn().mockResolvedValue([]),
        },
      ]);

      const result = await service.getDisputes();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('dp_stripe_1');
    });

    it('returns empty array when no disputes exist', async () => {
      gatewayRegistry.getAllGateways.mockReturnValue([
        { getDisputes: jest.fn().mockResolvedValue([]) },
        { getDisputes: jest.fn().mockResolvedValue([]) },
      ]);

      const result = await service.getDisputes();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles gateway failures gracefully', async () => {
      gatewayRegistry.getAllGateways.mockReturnValue([
        {
          getDisputes: jest
            .fn()
            .mockRejectedValue(new Error('Gateway timeout')),
        },
        {
          getDisputes: jest.fn().mockResolvedValue([
            {
              id: 'dp_rzp_1',
              amount: 1500,
              status: 'lost',
              createdAt: '2024-07-01T00:00:00Z',
            },
          ]),
        },
      ]);

      const result = await service.getDisputes();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('dp_rzp_1');
    });

    it('sorts disputes by createdAt descending', async () => {
      gatewayRegistry.getAllGateways.mockReturnValue([
        {
          getDisputes: jest.fn().mockResolvedValue([
            {
              id: 'dp_old',
              createdAt: '2024-01-01T00:00:00Z',
            },
            {
              id: 'dp_new',
              createdAt: '2024-12-01T00:00:00Z',
            },
            {
              id: 'dp_mid',
              createdAt: '2024-06-01T00:00:00Z',
            },
          ]),
        },
      ]);

      const result = await service.getDisputes();

      expect(result.data[0].id).toBe('dp_new');
      expect(result.data[1].id).toBe('dp_mid');
      expect(result.data[2].id).toBe('dp_old');
    });
  });
});
