import StripeLib from 'stripe';

export function createStripeClient(): any | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    return new StripeLib(key, { apiVersion: '2025-02-24.acacia' as any });
  } catch {
    return null;
  }
}

export async function createStripePaymentIntent(
  stripe: any,
  amountInr: number,
  idempotencyKey?: string,
) {
  const amount = amountInr * 100;
  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'inr',
      payment_method_types: ['card'],
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  return intent;
}

export async function refundStripePayment(
  stripe: any,
  providerPaymentId: string,
) {
  return stripe.refunds.create({ payment_intent: providerPaymentId });
}
