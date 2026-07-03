import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../../bookings/entities/payment.entity';
import { StripeAdapter } from './stripe.adapter';
import { RazorpayAdapter } from './razorpay.adapter';
import type { PaymentGateway } from '../interfaces/payment-gateway.interface';

@Injectable()
export class GatewayRegistry {
  private readonly gateways: PaymentGateway[];

  constructor(
    private readonly stripeAdapter: StripeAdapter,
    private readonly razorpayAdapter: RazorpayAdapter,
  ) {
    this.gateways = [stripeAdapter, razorpayAdapter];
  }

  getGateway(provider: PaymentProvider | string): PaymentGateway {
    for (const g of this.gateways) {
      if (g.supportsProvider(provider)) return g;
    }
    throw new Error(`No gateway found for provider: ${provider}`);
  }

  getAllGateways(): PaymentGateway[] {
    return this.gateways;
  }
}
