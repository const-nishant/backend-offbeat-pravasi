import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RazorpayAdapter } from '../providers/razorpay.adapter';

const mockOrdersCreate = jest.fn();
const mockPaymentsRefund = jest.fn();

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockOrdersCreate },
    payments: { refund: mockPaymentsRefund },
  }));
});

describe('RazorpayAdapter', () => {
  let adapter: RazorpayAdapter;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
    jest.clearAllMocks();
    adapter = new RazorpayAdapter();
  });

  describe('supportsProvider', () => {
    it('returns true for RAZORPAY', () => {
      expect(adapter.supportsProvider('RAZORPAY')).toBe(true);
    });

    it('returns false for STRIPE', () => {
      expect(adapter.supportsProvider('STRIPE')).toBe(false);
    });
  });

  describe('createPaymentIntent', () => {
    it('creates an order with correct amount in paise', async () => {
      mockOrdersCreate.mockResolvedValue({
        id: 'order_rzp_123',
        amount: 200000,
        currency: 'INR',
        receipt: 'receipt-1',
      });

      const result = await adapter.createPaymentIntent(2000, 'receipt-1');

      expect(mockOrdersCreate).toHaveBeenCalledWith({
        amount: 200000,
        currency: 'INR',
        receipt: 'receipt-1',
      });
      expect(result.providerPaymentId).toBe('order_rzp_123');
    });

    it('creates an order without receipt when no idempotencyKey', async () => {
      mockOrdersCreate.mockResolvedValue({
        id: 'order_rzp_456',
        amount: 100000,
        currency: 'INR',
      });

      const result = await adapter.createPaymentIntent(1000);

      expect(mockOrdersCreate).toHaveBeenCalledWith({
        amount: 100000,
        currency: 'INR',
        receipt: undefined,
      });
      expect(result.providerPaymentId).toBe('order_rzp_456');
    });

    it('throws error when razorpay is not configured', async () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      const unconfigured = new RazorpayAdapter();

      await expect(unconfigured.createPaymentIntent(1000)).rejects.toThrow(
        'Razorpay not configured',
      );
    });
  });

  describe('refundPayment', () => {
    it('refunds a payment with no extra params', async () => {
      mockPaymentsRefund.mockResolvedValue({
        id: 'rfnd_rzp_1',
        status: 'processed',
      });

      const result = await adapter.refundPayment('pay_rzp_123');

      expect(mockPaymentsRefund).toHaveBeenCalledWith('pay_rzp_123', {});
      expect(result.providerRefundId).toBe('rfnd_rzp_1');
      expect(result.status).toBe('processed');
    });

    it('refunds a payment with amount specified', async () => {
      mockPaymentsRefund.mockResolvedValue({
        id: 'rfnd_rzp_partial',
        status: 'processed',
      });

      await adapter.refundPayment('pay_rzp_123', 500);

      expect(mockPaymentsRefund).toHaveBeenCalledWith('pay_rzp_123', {
        amount: 50000,
      });
    });

    it('throws error when razorpay is not configured', async () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      const unconfigured = new RazorpayAdapter();

      await expect(unconfigured.refundPayment('pay_rzp_123')).rejects.toThrow(
        'Razorpay not configured',
      );
    });
  });

  describe('getDisputes', () => {
    it('returns an empty array', async () => {
      const result = await adapter.getDisputes();

      expect(result).toEqual([]);
    });
  });
});
