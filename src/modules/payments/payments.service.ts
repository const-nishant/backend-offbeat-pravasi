import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from '../bookings/entities/payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { TicketService } from '../bookings/ticket.service';
import {
  createStripeClient,
  createStripePaymentIntent,
} from './providers/stripe.provider';
import {
  createRazorpayClient,
  createRazorpayOrder,
} from './providers/razorpay.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly ticketService: TicketService,
  ) {}

  async createCheckout(opts: {
    bookingId: string;
    provider: PaymentProvider;
    idempotencyKey?: string;
  }) {
    const { bookingId, provider, idempotencyKey } = opts;

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING)
      throw new BadRequestException('Booking is not pending');

    // create payment record
    const payment = this.paymentRepo.create({
      bookingId,
      provider,
      amountInr: booking.totalAmountInr,
      currency: 'INR',
      idempotencyKey: idempotencyKey ?? null,
    } as Partial<Payment>);
    await this.paymentRepo.save(payment);

    // Provider-specific flows
    if (provider === PaymentProvider.STRIPE) {
      const stripe = createStripeClient();
      if (!stripe) throw new Error('Stripe not configured');
      const intent = await createStripePaymentIntent(
        stripe,
        payment.amountInr,
        idempotencyKey,
      );
      payment.providerPaymentId = intent.id as any;
      payment.providerResponse = intent as any;
      await this.paymentRepo.save(payment);
      return {
        paymentId: payment.id,
        provider: 'STRIPE',
        clientSecret: (intent as any).client_secret,
      };
    }

    if (provider === PaymentProvider.RAZORPAY) {
      const razor = createRazorpayClient();
      if (!razor) throw new Error('Razorpay not configured');
      const order = await createRazorpayOrder(
        razor,
        payment.amountInr,
        payment.id,
      );
      payment.providerPaymentId = order.id as any;
      payment.providerResponse = order as any;
      await this.paymentRepo.save(payment);
      return { paymentId: payment.id, provider: 'RAZORPAY', order };
    }

    return {
      paymentId: payment.id,
      amountInr: payment.amountInr,
      currency: payment.currency,
    };
  }

  async handleProviderSuccess(
    provider: PaymentProvider,
    providerPaymentId: string,
    amount: number,
  ) {
    // find payment by providerPaymentId or by id
    const payment = await this.paymentRepo.findOne({
      where: [{ providerPaymentId }, { id: providerPaymentId }] as any,
    });
    if (!payment) {
      this.logger.warn(
        `Payment record not found for providerPaymentId=${providerPaymentId}`,
      );
      return null;
    }

    payment.status = PaymentStatus.SUCCEEDED;
    payment.providerPaymentId = providerPaymentId;
    payment.amountInr = amount;
    await this.paymentRepo.save(payment);

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found for payment');
    booking.status = BookingStatus.CONFIRMED;
    // attach payment reference
    (booking as any).paymentId = payment.id;
    booking.metadata = {
      ...(booking.metadata ?? {}),
      ticketIssued: false,
    } as any;
    await this.bookingRepo.save(booking);

    // Issue signed ticket token
    try {
      const ticket = await this.ticketService.generateSignedTicket({
        bookingId: booking.id,
        userId: booking.userId,
      });
      booking.metadata = {
        ...(booking.metadata ?? {}),
        ticketToken: ticket.token,
        ticketIssued: true,
        ticketIssuedAt: new Date().toISOString(),
      } as any;
      await this.bookingRepo.save(booking);
      return { payment, booking, ticket };
    } catch (e) {
      // don't fail the payment flow if ticket issuance fails
      return { payment, booking, ticketError: (e as any).message };
    }
  }

  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    // Integration with provider refund API should be implemented; here we mark refunded locally
    payment.status = PaymentStatus.REFUNDED;
    await this.paymentRepo.save(payment);

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (booking) {
      booking.status = BookingStatus.CANCELLED;
      booking.metadata = {
        ...booking.metadata,
        refundReason: reason ?? null,
      } as any;
      await this.bookingRepo.save(booking);
    }

    return { payment, booking };
  }
}
