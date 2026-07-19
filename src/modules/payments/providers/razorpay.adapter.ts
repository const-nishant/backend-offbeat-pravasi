import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import type {
  PaymentGateway,
  RefundResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class RazorpayAdapter implements PaymentGateway {
  private readonly logger = new Logger(RazorpayAdapter.name);
  private readonly client: Razorpay | null;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      this.client = null;
      return;
    }
    try {
      this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    } catch {
      this.client = null;
    }
  }

  supportsProvider(provider: string): boolean {
    return provider === 'RAZORPAY';
  }

  getClient(): Razorpay | null {
    return this.client;
  }

  async createPaymentIntent(
    amountInr: number,
    idempotencyKey?: string,
  ): Promise<{ providerPaymentId: string; rawResponse: any }> {
    const razorpay = this.client;
    if (!razorpay) throw new Error('Razorpay not configured');
    const amount = amountInr * 100;
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: idempotencyKey ?? undefined,
    });
    return {
      providerPaymentId: (order as any).id,
      rawResponse: order,
    };
  }

  async refundPayment(
    providerPaymentId: string,
    amount?: number,
    idempotencyKey?: string,
  ): Promise<RefundResult> {
    const razorpay = this.client;
    if (!razorpay) throw new Error('Razorpay not configured');
    const params: any = {};
    if (amount !== undefined) {
      params.amount = amount * 100;
    }
    const refund = await razorpay.payments.refund(providerPaymentId, params);
    return {
      providerRefundId: (refund as any).id,
      status: (refund as any).status,
    };
  }

  async getDisputes(): Promise<any[]> {
    return [];
  }
}
