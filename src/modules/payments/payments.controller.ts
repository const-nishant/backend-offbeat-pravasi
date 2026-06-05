import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dtos/create-checkout.dto';
import { createStripeClient } from './providers/stripe.provider';
import { createRazorpayClient } from './providers/razorpay.provider';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  async createCheckout(@Body() body: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(body as any);
  }

  @Post('webhook/:provider')
  async providerWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Headers() headers: any,
  ) {
    // Providers will call this endpoint with their payloads. Actual verification occurs in provider adapters.
    // For simplicity, we expect provider-specific logic to call PaymentsService.handleProviderSuccess
    const payload = req.body;
    if (provider === 'stripe') {
      const stripe = createStripeClient();
      if (!stripe) throw new BadRequestException('Stripe not configured');
      const sig = headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!sig || !webhookSecret)
        throw new BadRequestException('Missing webhook signature or secret');
      let event: any;
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody || req.body,
          sig,
          webhookSecret,
        );
      } catch {
        throw new BadRequestException('Invalid stripe webhook');
      }
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object;
        const providerPaymentId = intent.id;
        const amount = Math.round((intent.amount || 0) / 100);
        return this.paymentsService.handleProviderSuccess(
          'STRIPE' as any,
          providerPaymentId,
          amount,
        );
      }
      return { received: true };
    }

    if (provider === 'razorpay') {
      const razor = createRazorpayClient();
      if (!razor) throw new BadRequestException('Razorpay not configured');
      const sig =
        headers['x-razorpay-signature'] || headers['razorpay-signature'];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!sig || !webhookSecret)
        throw new BadRequestException(
          'Missing razorpay webhook signature or secret',
        );
      // compute HMAC of raw body
      const crypto = await import('crypto');
      const raw = req.rawBody || JSON.stringify(req.body || {});
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(raw)
        .digest('hex');
      if (expected !== sig)
        throw new BadRequestException('Invalid razorpay webhook signature');

      const obj = payload || {};
      const paymentEntity =
        obj['payload']?.payment?.entity || obj['payment'] || null;
      const orderId =
        paymentEntity?.order_id || obj['payload']?.order?.entity?.id || null;
      const amount = paymentEntity?.amount
        ? Math.round(paymentEntity.amount / 100)
        : obj['amount'];
      if (orderId)
        return this.paymentsService.handleProviderSuccess(
          'RAZORPAY' as any,
          orderId,
          amount || 0,
        );
      return { received: true };
    }

    return { received: true };
  }
}
