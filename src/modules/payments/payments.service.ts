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
import { GatewayRegistry } from './providers/gateway-registry.service';
import type { PaymentGateway } from './interfaces/payment-gateway.interface';
import { Trek } from '../treks/entities/trek.entity';
import { MailerService } from '../mailer/mailer.service';
import type {
  BookingDetails,
  PaymentDetails,
  BookingAlertDetails,
} from '../mailer/interfaces/mailer.interface';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly notificationsService: NotificationsService,
    private readonly gatewayRegistry: GatewayRegistry,
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
      const gateway = this.gatewayRegistry.getGateway(provider);
      const intent = await gateway.createPaymentIntent(
        payment.amountInr,
        idempotencyKey,
      );
      payment.providerPaymentId = intent.providerPaymentId as any;
      payment.providerResponse = intent.rawResponse as any;
      await this.paymentRepo.save(payment);
      return {
        paymentId: payment.id,
        provider: 'STRIPE',
        clientSecret: (intent.rawResponse as any).client_secret,
      };
    }

    if (provider === PaymentProvider.RAZORPAY) {
      const gateway = this.gatewayRegistry.getGateway(provider);
      const order = await gateway.createPaymentIntent(
        payment.amountInr,
        payment.id,
      );
      payment.providerPaymentId = order.providerPaymentId as any;
      payment.providerResponse = order.rawResponse as any;
      await this.paymentRepo.save(payment);
      return {
        paymentId: payment.id,
        provider: 'RAZORPAY',
        order: order.rawResponse,
      };
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
        .leftJoinAndSelect('t.organizer', 'org')
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

      this.sendPaymentReceipt(booking, payment, trek).catch((e) =>
        this.logger.error('Payment receipt email failed', e),
      );

      this.sendOrganizerBookingAlert(booking, trek).catch((e) =>
        this.logger.error('Organizer booking alert failed', e),
      );

      if (ticket) {
        this.sendTicketWithAttachment(booking, trek, ticket).catch((e) =>
          this.logger.error('Ticket email failed', e),
        );
      }

      this.notificationsService
        .notifyBookingConfirmed(booking.userId, booking.id)
        .catch((e) => this.logger.error('Push notification failed', e as any));

      if (trek?.organizer?.id) {
        this.notificationsService
          .notifyNewBookingToOrganizer(
            trek.organizer.id,
            trek.name,
            booking.id,
            booking.quantity,
          )
          .catch((e) =>
            this.logger.error('Organizer push notification failed', e as any),
          );
      }

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
        const details: BookingDetails = {
          name: booking.metadata?.contactName ?? 'Traveller',
          trekName,
          bookingId: booking.id,
          amount: booking.totalAmountInr,
          startDate: trek?.startDate?.toISOString() ?? 'TBD',
          quantity: booking.quantity,
        };

        await this.mailerService.sendBookingConfirmationEmail(
          userEmail,
          details,
        );
      }
    } catch (e) {
      this.logger.error('Failed to send confirmation email', e as any);
    }
  }

  private async sendPaymentReceipt(
    booking: Booking,
    payment: Payment,
    trek?: Trek | null,
  ) {
    try {
      const userEmail = booking.metadata?.contactEmail;
      if (!userEmail) return;

      const details: PaymentDetails = {
        name: booking.metadata?.contactName ?? 'Traveller',
        trekName: trek?.name ?? booking.trekSnapshot?.name,
        bookingId: booking.id,
        amount: payment.amountInr,
        paymentId: payment.id,
        paymentDate: new Date().toISOString(),
      };

      await this.mailerService.sendPaymentReceiptEmail(userEmail, details);
    } catch (e) {
      this.logger.error('Failed to send payment receipt email', e as any);
    }
  }

  private async sendOrganizerBookingAlert(
    booking: Booking,
    trek?: Trek | null,
  ) {
    try {
      const organizerEmail = trek?.organizer?.email;
      const organizerName =
        trek?.organizer?.fullName ?? trek?.organizer?.email ?? 'Organizer';
      if (!organizerEmail) return;

      const details: BookingAlertDetails = {
        organizerName,
        trekName: trek?.name ?? booking.trekSnapshot?.name ?? 'Trek',
        bookingId: booking.id,
        customerName: booking.metadata?.contactName ?? 'Traveller',
        quantity: booking.quantity,
        totalAmount: booking.totalAmountInr,
      };

      await this.mailerService.sendNewBookingAlertEmail(
        organizerEmail,
        details,
      );
    } catch (e) {
      this.logger.error('Failed to send organizer booking alert', e as any);
    }
  }

  private async sendTicketWithAttachment(
    booking: Booking,
    trek?: Trek | null,
    _ticket?: any,
  ) {
    try {
      const userEmail = booking.metadata?.contactEmail;
      if (!userEmail) return;

      const details: BookingDetails = {
        name: booking.metadata?.contactName ?? 'Traveller',
        trekName: trek?.name ?? booking.trekSnapshot?.name ?? 'Trek',
        bookingId: booking.id,
        amount: booking.totalAmountInr,
        startDate: trek?.startDate?.toISOString() ?? 'TBD',
        quantity: booking.quantity,
        location: trek?.location ?? undefined,
      };

      await this.mailerService.sendTicketEmail(userEmail, details);
    } catch (e) {
      this.logger.error('Failed to send ticket email', e as any);
    }
  }

  async handleProviderRefund(
    provider: PaymentProvider,
    providerPaymentId: string,
    amount: number,
  ) {
    const payment = await this.paymentRepo.findOne({
      where: { providerPaymentId } as any,
    });
    if (!payment) {
      this.logger.warn(
        `Refund webhook: payment not found for ${providerPaymentId}`,
      );
      return null;
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return { payment, alreadyRefunded: true };
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      refundedAt: new Date().toISOString(),
      refundSource: 'provider_webhook',
    } as any;
    await this.paymentRepo.save(payment);

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (booking) {
      booking.status = BookingStatus.CANCELLED;
      await this.bookingRepo.save(booking);
    }

    return { payment, booking };
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
      const gateway = this.gatewayRegistry.getGateway(payment.provider);
      if (payment.providerPaymentId) {
        await gateway.refundPayment(
          payment.providerPaymentId,
          payment.amountInr,
          payment.id,
        );
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

    try {
      const userEmail = booking?.metadata?.contactEmail;
      if (userEmail) {
        await this.mailerService.sendRefundProcessedEmail(userEmail, {
          name: booking.metadata?.contactName ?? 'Traveller',
          bookingId: booking.id,
          refundAmount: payment.amountInr,
        });
      }
    } catch (e) {
      this.logger.error('Failed to send refund email', e as any);
    }

    return { payment, booking };
  }
}
