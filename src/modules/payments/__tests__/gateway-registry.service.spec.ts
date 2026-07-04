import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GatewayRegistry } from '../providers/gateway-registry.service';

describe('GatewayRegistry', () => {
  let registry: GatewayRegistry;
  let stripeAdapter: any;
  let razorpayAdapter: any;

  beforeEach(() => {
    stripeAdapter = {
      supportsProvider: jest.fn((p) => p === 'STRIPE'),
      createPaymentIntent: jest.fn(),
      refundPayment: jest.fn(),
      getDisputes: jest.fn(),
    };

    razorpayAdapter = {
      supportsProvider: jest.fn((p) => p === 'RAZORPAY'),
      createPaymentIntent: jest.fn(),
      refundPayment: jest.fn(),
      getDisputes: jest.fn(),
    };

    registry = new GatewayRegistry(stripeAdapter, razorpayAdapter);
  });

  describe('getGateway', () => {
    it('returns StripeAdapter for STRIPE provider', () => {
      const gateway = registry.getGateway('STRIPE');

      expect(gateway).toBe(stripeAdapter);
    });

    it('returns RazorpayAdapter for RAZORPAY provider', () => {
      const gateway = registry.getGateway('RAZORPAY');

      expect(gateway).toBe(razorpayAdapter);
    });

    it('throws error for unsupported provider', () => {
      expect(() => registry.getGateway('PAYPAL')).toThrow(
        'No gateway found for provider: PAYPAL',
      );
    });

    it('throws error for empty string', () => {
      expect(() => registry.getGateway('')).toThrow(
        'No gateway found for provider: ',
      );
    });
  });

  describe('getAllGateways', () => {
    it('returns all registered gateways', () => {
      const gateways = registry.getAllGateways();

      expect(gateways).toHaveLength(2);
      expect(gateways[0]).toBe(stripeAdapter);
      expect(gateways[1]).toBe(razorpayAdapter);
    });

    it('returns a new array each call (no mutation)', () => {
      const gateways1 = registry.getAllGateways();
      const gateways2 = registry.getAllGateways();

      expect(gateways1).toEqual(gateways2);
    });
  });
});
