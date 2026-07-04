import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dtos/create-checkout.dto';
import { createStripeClient } from './providers/stripe.provider';
import { createRazorpayClient } from './providers/razorpay.provider';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a payment checkout session' })
  async createCheckout(@Body() body: CreateCheckoutDto, @Req() req: any) {
    return this.paymentsService.createCheckout({
      ...body,
      userId: req.user.id,
    } as any);
  }

  @Post('webhook/:provider')
  @ApiOperation({
    summary: 'Handle payment provider webhook (Stripe/Razorpay)',
  })
  async providerWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Headers() headers: any,
  ) {
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
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
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
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

      if (event.type === 'payment_intent.payment_failed') {
        const intent = event.data.object;
        return this.paymentsService.handleProviderFailure(
          'STRIPE' as any,
          intent.id,
        );
      }

      if (event.type === 'charge.refunded') {
        const intent = event.data.object;
        const providerPaymentId = intent.payment_intent || intent.id;
        const amount = Math.round((intent.amount || 0) / 100);
        await this.paymentsService
          .handleProviderRefund('STRIPE' as any, providerPaymentId, amount)
          .catch((e) =>
            console.error('Stripe refund webhook processing failed', e),
          );
        return { received: true };
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

      const crypto = await import('crypto');
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest();
      const sigBuffer = Buffer.from(sig, 'hex');
      if (
        expected.length !== sigBuffer.length ||
        !crypto.timingSafeEqual(expected, sigBuffer)
      )
        throw new BadRequestException('Invalid razorpay webhook signature');

      const obj = payload || {};
      const paymentEntity =
        obj['payload']?.payment?.entity || obj['payment'] || null;
      const orderId =
        paymentEntity?.order_id || obj['payload']?.order?.entity?.id || null;
      const amount = paymentEntity?.amount
        ? Math.round(paymentEntity.amount / 100)
        : obj['amount'];
      const eventType = obj['event'] || '';

      if (eventType === 'payment.captured' && orderId) {
        return this.paymentsService.handleProviderSuccess(
          'RAZORPAY' as any,
          orderId,
          amount || 0,
        );
      }

      if (eventType === 'payment.failed' && orderId) {
        return this.paymentsService.handleProviderFailure(
          'RAZORPAY' as any,
          orderId,
        );
      }

      return { received: true };
    }

    return { received: true };
  }
}
