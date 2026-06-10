import Razorpay from 'razorpay';

export function createRazorpayClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  try {
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  } catch {
    return null;
  }
}

export async function createRazorpayOrder(
  razorpay: Razorpay,
  amountInr: number,
  receipt?: string,
) {
  const amount = amountInr * 100;
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: receipt ?? undefined,
  });
  return order;
}

export async function refundRazorpayPayment(
  razorpay: Razorpay,
  providerPaymentId: string,
) {
  return razorpay.payments.refund(providerPaymentId, {});
}
