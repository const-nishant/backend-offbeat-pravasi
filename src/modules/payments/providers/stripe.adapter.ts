import { Injectable, Logger } from '@nestjs/common';
import StripeLib from 'stripe';
import type { PaymentGateway, RefundResult } from '../interfaces/payment-gateway.interface';

@Injectable()
export class StripeAdapter implements PaymentGateway {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly client: any | null;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      this.client = null;
      return;
    }
    try {
      this.client = new StripeLib(key, { apiVersion: '2025-02-24.acacia' as any });
    } catch {
      this.client = null;
    }
  }

  supportsProvider(provider: string): boolean {
    return provider === 'STRIPE';
  }

  async createPaymentIntent(
    amountInr: number,
    idempotencyKey?: string,
  ): Promise<{ providerPaymentId: string; rawResponse: any }> {
    const stripe = this.client;
    if (!stripe) throw new Error('Stripe not configured');
    const amount = amountInr * 100;
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency: 'inr',
        payment_method_types: ['card'],
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    return {
      providerPaymentId: intent.id,
      rawResponse: intent,
    };
  }

  async refundPayment(
    providerPaymentId: string,
    amount?: number,
  ): Promise<RefundResult> {
    const stripe = this.client;
    if (!stripe) throw new Error('Stripe not configured');
    const params: any = { payment_intent: providerPaymentId };
    if (amount !== undefined) {
      params.amount = Math.round(amount * 100);
    }
    const refund = await stripe.refunds.create(params);
    return {
      providerRefundId: refund.id,
      status: refund.status,
    };
  }

  async getDisputes(): Promise<any[]> {
    const stripe = this.client;
    if (!stripe) return [];
    try {
      const disputes = await stripe.disputes.list({ limit: 100 });
      return disputes.data.map((d) => ({
        id: d.id,
        paymentIntentId: d.payment_intent,
        amount: d.amount / 100,
        currency: d.currency,
        status: d.status,
        reason: d.reason,
        evidence: d.evidence_details,
        createdAt: new Date(d.created * 1000).toISOString(),
      }));
    } catch (e) {
      this.logger.error('Failed to fetch Stripe disputes', e as any);
      return [];
    }
  }
}
