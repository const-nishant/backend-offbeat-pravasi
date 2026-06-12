import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
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
  refundStripePayment,
} from './providers/stripe.provider';
import {
  createRazorpayClient,
  createRazorpayOrder,
  refundRazorpayPayment,
} from './providers/razorpay.provider';
import { Trek } from '../treks/entities/trek.entity';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    private readonly ticketService: TicketService,
    private readonly mailerService: MailerService,
    private readonly dataSource: DataSource,
  ) {}

  async createCheckout(opts: {
    bookingId: string;
    provider: PaymentProvider;
    idempotencyKey?: string;
    userId: string;
  }) {
    const { bookingId, provider, idempotencyKey, userId } = opts;

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId)
      throw new ForbiddenException('Booking does not belong to user');
    if (booking.status !== BookingStatus.PENDING)
      throw new BadRequestException('Booking is not pending');

    if (idempotencyKey) {
      const existing = await this.paymentRepo.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          paymentId: existing.id,
          provider,
          duplicate: true,
          status: existing.status,
        };
      }
    }

    const payment = this.paymentRepo.create({
      bookingId,
      provider,
      amountInr: booking.totalAmountInr,
      currency: 'INR',
      idempotencyKey: idempotencyKey ?? null,
    } as Partial<Payment>);
    await this.paymentRepo.save(payment);

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
    const payment = await this.paymentRepo.findOne({
      where: { providerPaymentId } as any,
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

    return this.confirmBooking(payment);
  }

  async handleProviderFailure(
    provider: PaymentProvider,
    providerPaymentId: string,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { providerPaymentId } as any,
    });
    if (!payment) {
      this.logger.warn(
        `Payment record not found for failure: providerPaymentId=${providerPaymentId}`,
      );
      return null;
    }

    payment.status = PaymentStatus.FAILED;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      failedAt: new Date().toISOString(),
    } as any;
    await this.paymentRepo.save(payment);

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (booking) {
      booking.status = BookingStatus.FAILED;
      booking.metadata = {
        ...(booking.metadata ?? {}),
        paymentFailedAt: new Date().toISOString(),
      } as any;
      await this.bookingRepo.save(booking);
    }

    return { payment, booking };
  }

  private async confirmBooking(payment: Payment) {
    return await this.dataSource.transaction(async (em) => {
      const booking = await em
        .getRepository(Booking)
        .findOne({ where: { id: payment.bookingId } });
      if (!booking)
        throw new NotFoundException('Booking not found for payment');
      if (booking.status === BookingStatus.CONFIRMED) {
        return { payment, booking, alreadyConfirmed: true };
      }

      booking.status = BookingStatus.CONFIRMED;
      (booking as any).paymentId = payment.id;
      booking.metadata = {
        ...(booking.metadata ?? {}),
        ticketIssued: false,
      } as any;
      await em.getRepository(Booking).save(booking);

      const trek = await em
        .getRepository(Trek)
        .createQueryBuilder('t')
        .setLock('pessimistic_write')
        .where('t.id = :id', { id: booking.trekId })
        .getOne();
      if (trek) {
        await em
          .getRepository(Trek)
          .createQueryBuilder()
          .update(Trek)
          .set({
            currentParticipants: () =>
              `current_participants + ${booking.quantity}`,
          })
          .where('id = :id', { id: booking.trekId })
          .execute();
      }

      let ticket: any = null;
      try {
        ticket = await this.ticketService.generateSignedTicket({
          bookingId: booking.id,
          userId: booking.userId,
        });
        booking.metadata = {
          ...(booking.metadata ?? {}),
          ticketToken: ticket.token,
          ticketIssued: true,
          ticketIssuedAt: new Date().toISOString(),
        } as any;
        await em.getRepository(Booking).save(booking);
      } catch (e) {
        this.logger.error('Ticket issuance failed after payment', e as any);
      }

      this.sendConfirmationNotification(booking, trek).catch((e) =>
        this.logger.error('Confirmation notification failed', e),
      );

      return { payment, booking, ticket };
    });
  }

  private async sendConfirmationNotification(
    booking: Booking,
    trek?: Trek | null,
  ) {
    try {
      const trekName = trek?.name ?? booking.trekSnapshot?.name ?? 'Trek';
      const userEmail = booking.metadata?.contactEmail;

      if (userEmail) {
        await this.mailerService.sendEmail({
          to: userEmail,
          subject: `Booking Confirmed - ${trekName}`,
          html: `
<h2>Booking Confirmed!</h2>
<p>Your booking for <strong>${trekName}</strong> has been confirmed.</p>
<ul>
  <li>Booking ID: ${booking.id}</li>
  <li>Quantity: ${booking.quantity}</li>
  <li>Total Paid: INR ${booking.totalAmountInr}</li>
</ul>
<p>You can download your ticket from your bookings page.</p>
<p>Thank you for choosing Offbeat Pravasi!</p>
          `,
        });
      }
    } catch (e) {
      this.logger.error('Failed to send confirmation email', e as any);
    }
  }

  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only succeeded payments can be refunded');
    }

    try {
      if (payment.provider === PaymentProvider.STRIPE) {
        const stripe = createStripeClient();
        if (stripe && payment.providerPaymentId) {
          await refundStripePayment(stripe, payment.providerPaymentId);
        }
      } else if (payment.provider === PaymentProvider.RAZORPAY) {
        const razor = createRazorpayClient();
        if (razor && payment.providerPaymentId) {
          await refundRazorpayPayment(razor, payment.providerPaymentId);
        }
      }
    } catch (e) {
      this.logger.error(
        `Provider refund failed for payment ${paymentId}`,
        e as any,
      );
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      refundReason: reason ?? null,
      refundedAt: new Date().toISOString(),
    } as any;
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
