import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AdminPaymentController } from '../admin-payment.controller';
import {
  PaymentProvider,
  PaymentStatus,
} from '../../bookings/entities/payment.entity';

describe('AdminPaymentController', () => {
  let controller: AdminPaymentController;
  let service: any;

  const mockActor = { id: 'admin-1', email: 'admin@test.com', isAdmin: true };

  beforeEach(() => {
    service = {
      searchPayments: jest.fn().mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      refundPayment: jest.fn().mockResolvedValue({
        payment: { id: 'pay-1', status: PaymentStatus.REFUNDED },
        refundEntry: { refundId: 'rf-1', amount: 2000 },
      }),
      retryPayment: jest.fn().mockResolvedValue({
        paymentId: 'pay-retry-1',
        provider: 'RAZORPAY',
        status: PaymentStatus.CREATED,
      }),
      getDisputes: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
      }),
    };

    controller = new AdminPaymentController(service);
  });

  describe('searchPayments', () => {
    it('delegates to service with query params', async () => {
      const query = {
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.SUCCEEDED,
        page: 1,
        limit: 50,
      };

      await controller.searchPayments(query as any);

      expect(service.searchPayments).toHaveBeenCalledWith(query);
    });

    it('handles empty query gracefully', async () => {
      const result = await controller.searchPayments({} as any);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(service.searchPayments).toHaveBeenCalledWith({});
    });
  });

  describe('refundPayment', () => {
    it('delegates to service with payment ID, body, user, and request', async () => {
      const req = { user: mockActor, ip: '127.0.0.1', headers: {} };
      const body = { amount: 500, reason: 'Customer requested partial refund' };

      const result = await controller.refundPayment('pay-1', body, req);

      expect(service.refundPayment).toHaveBeenCalledWith(
        'pay-1',
        body,
        mockActor,
        req,
      );
      expect(result.payment.status).toBe(PaymentStatus.REFUNDED);
    });

    it('handles full refund without amount specified', async () => {
      const req = { user: mockActor, ip: '::1', headers: {} };
      const body = { reason: 'Admin initiated full refund' };

      const result = await controller.refundPayment('pay-1', body, req);

      expect(service.refundPayment).toHaveBeenCalledWith(
        'pay-1',
        body,
        mockActor,
        req,
      );
      expect(result.refundEntry.refundId).toBe('rf-1');
    });
  });

  describe('retryPayment', () => {
    it('delegates to service with payment ID, DTO, user, and request', async () => {
      const req = { user: mockActor, ip: '10.0.0.1', headers: {} };
      const body = {
        provider: PaymentProvider.RAZORPAY,
        idempotencyKey: 'retry-key-1',
      };

      const result = await controller.retryPayment('pay-1', body, req);

      expect(service.retryPayment).toHaveBeenCalledWith(
        'pay-1',
        body,
        mockActor,
        req,
      );
      expect(result.provider).toBe('RAZORPAY');
    });
  });

  describe('getDisputes', () => {
    it('delegates to service', async () => {
      const result = await controller.getDisputes();

      expect(service.getDisputes).toHaveBeenCalled();
      expect(result.total).toBe(0);
    });
  });
});
