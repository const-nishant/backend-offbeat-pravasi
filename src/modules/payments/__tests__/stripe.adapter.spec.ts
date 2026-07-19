import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StripeAdapter } from '../providers/stripe.adapter';

const mockStripeCreate = jest.fn();
const mockRefundsCreate = jest.fn();
const mockDisputesList = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockStripeCreate },
    refunds: { create: mockRefundsCreate },
    disputes: { list: mockDisputesList },
    webhooks: { constructEvent: jest.fn() },
  }));
});

describe('StripeAdapter', () => {
  let adapter: StripeAdapter;

  beforeEach(() => {
    process.env.STRIPE_RESTRICTED_KEY = 'rk_test_123';
    jest.clearAllMocks();
    adapter = new StripeAdapter();
  });

  describe('supportsProvider', () => {
    it('returns true for STRIPE', () => {
      expect(adapter.supportsProvider('STRIPE')).toBe(true);
    });

    it('returns false for RAZORPAY', () => {
      expect(adapter.supportsProvider('RAZORPAY')).toBe(false);
    });

    it('returns false for unknown providers', () => {
      expect(adapter.supportsProvider('PAYPAL')).toBe(false);
    });
  });

  describe('createPaymentIntent', () => {
    it('creates a payment intent with correct amount in paise', async () => {
      mockStripeCreate.mockResolvedValue({
        id: 'pi_mock_123',
        client_secret: 'cs_mock_secret',
        amount: 200000,
      });

      const result = await adapter.createPaymentIntent(2000);

      expect(mockStripeCreate).toHaveBeenCalledWith(
        {
          amount: 200000,
          currency: 'inr',
          automatic_payment_methods: { enabled: true },
        },
        undefined,
      );
      expect(result.providerPaymentId).toBe('pi_mock_123');
    });

    it('passes idempotencyKey when provided', async () => {
      mockStripeCreate.mockResolvedValue({
        id: 'pi_idem_1',
        client_secret: 'cs_idem',
      });

      await adapter.createPaymentIntent(1000, 'idem-key-1');

      expect(mockStripeCreate).toHaveBeenCalledWith(expect.any(Object), {
        idempotencyKey: 'idem-key-1',
      });
    });

    it('throws error when stripe is not configured', async () => {
      delete process.env.STRIPE_RESTRICTED_KEY;
      const unconfigured = new StripeAdapter();

      await expect(unconfigured.createPaymentIntent(1000)).rejects.toThrow(
        'Stripe not configured',
      );
    });
  });

  describe('refundPayment', () => {
    it('creates a full refund when no amount specified', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 'rf_stripe_1',
        status: 'succeeded',
      });

      const result = await adapter.refundPayment('pi_stripe_123');

      expect(mockRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_stripe_123',
        },
        undefined,
      );
      expect(result.providerRefundId).toBe('rf_stripe_1');
      expect(result.status).toBe('succeeded');
    });

    it('creates a partial refund with amount in paise', async () => {
      mockRefundsCreate.mockResolvedValue({
        id: 'rf_partial_1',
        status: 'succeeded',
      });

      await adapter.refundPayment('pi_stripe_123', 500);

      expect(mockRefundsCreate).toHaveBeenCalledWith(
        {
          payment_intent: 'pi_stripe_123',
          amount: 50000,
        },
        undefined,
      );
    });

    it('throws error when stripe is not configured', async () => {
      delete process.env.STRIPE_RESTRICTED_KEY;
      const unconfigured = new StripeAdapter();

      await expect(unconfigured.refundPayment('pi_123')).rejects.toThrow(
        'Stripe not configured',
      );
    });
  });

  describe('getDisputes', () => {
    it('returns mapped disputes from Stripe', async () => {
      mockDisputesList.mockResolvedValue({
        data: [
          {
            id: 'dp_1',
            payment_intent: 'pi_1',
            amount: 200000,
            currency: 'inr',
            status: 'under_review',
            reason: 'fraudulent',
            evidence_details: { due_by: 1700000000 },
            created: 1680000000,
          },
          {
            id: 'dp_2',
            payment_intent: 'pi_2',
            amount: 50000,
            currency: 'inr',
            status: 'won',
            reason: 'product_not_received',
            evidence_details: {},
            created: 1690000000,
          },
        ],
      });

      const result = await adapter.getDisputes();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('dp_1');
      expect(result[0].amount).toBe(2000);
      expect(result[0].status).toBe('under_review');
      expect(result[1].id).toBe('dp_2');
      expect(result[1].amount).toBe(500);
    });

    it('returns empty array when API call fails', async () => {
      mockDisputesList.mockRejectedValue(new Error('API error'));

      const result = await adapter.getDisputes();

      expect(result).toEqual([]);
    });

    it('returns empty array when stripe is not configured', async () => {
      delete process.env.STRIPE_RESTRICTED_KEY;
      const unconfigured = new StripeAdapter();

      const result = await unconfigured.getDisputes();

      expect(result).toEqual([]);
    });
  });
});
