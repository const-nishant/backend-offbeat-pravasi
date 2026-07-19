import type { Repository, DataSource } from 'typeorm';
import { PaymentsService } from './payments.service';
import type { Payment } from '../bookings/entities/payment.entity';
import {
  PaymentProvider,
  PaymentStatus,
} from '../bookings/entities/payment.entity';
import type { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/entities/booking.entity';
import type { Trek } from '../treks/entities/trek.entity';
import type { TicketService } from '../bookings/ticket.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  beforeAll,
  afterEach,
} from '@jest/globals';

// Mock payment providers
const mockStripeIntent = {
  id: 'pi_mock_123',
  client_secret: 'cs_mock_secret',
};
const mockRazorpayOrder = {
  id: 'order_mock_123',
  amount: 200000,
  currency: 'INR',
};

const mockStripeGateway = {
  supportsProvider: jest.fn((p: string) => p === 'STRIPE'),
  getClient: jest.fn(() => ({
    paymentIntents: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn() },
  })),
  createPaymentIntent: jest.fn(() =>
    Promise.resolve({
      providerPaymentId: mockStripeIntent.id,
      rawResponse: mockStripeIntent,
    }),
  ),
  refundPayment: jest.fn(() => Promise.resolve({ id: 'refund_mock' })),
  getDisputes: jest.fn(() => Promise.resolve([])),
};

const mockRazorpayGateway = {
  supportsProvider: jest.fn((p: string) => p === 'RAZORPAY'),
  getClient: jest.fn(() => ({
    orders: { create: jest.fn() },
    payments: { refund: jest.fn() },
  })),
  createPaymentIntent: jest.fn(() =>
    Promise.resolve({
      providerPaymentId: mockRazorpayOrder.id,
      rawResponse: mockRazorpayOrder,
    }),
  ),
  refundPayment: jest.fn(() => Promise.resolve({ id: 'rfnd_mock' })),
  getDisputes: jest.fn(() => Promise.resolve([])),
};

jest.mock('./providers/stripe.adapter', () => ({
  StripeAdapter: jest.fn().mockImplementation(() => mockStripeGateway),
}));

jest.mock('./providers/razorpay.adapter', () => ({
  RazorpayAdapter: jest.fn().mockImplementation(() => mockRazorpayGateway),
}));

const mockGatewayRegistry = {
  getGateway: jest.fn((provider: string) =>
    provider === 'STRIPE' ? mockStripeGateway : mockRazorpayGateway,
  ),
  getAllGateways: jest.fn(() => [mockStripeGateway, mockRazorpayGateway]),
};

jest.mock('./providers/gateway-registry.service', () => ({
  GatewayRegistry: jest.fn().mockImplementation(() => mockGatewayRegistry),
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: jest.Mocked<Repository<Payment>>;
  let bookingRepo: jest.Mocked<Repository<Booking>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let dataSource: jest.Mocked<DataSource>;
  let ticketService: jest.Mocked<TicketService>;

  const mockBooking = {
    id: 'booking-1',
    trekId: 'trek-1',
    userId: 'user-1',
    quantity: 2,
    unitPriceInr: 1000,
    totalAmountInr: 2000,
    status: BookingStatus.PENDING,
    trekSnapshot: { name: 'Test Trek' },
    metadata: { contactEmail: 'test@example.com' },
  } as any;

  const mockPayment = {
    id: 'payment-1',
    bookingId: 'booking-1',
    provider: PaymentProvider.STRIPE,
    amountInr: 2000,
    currency: 'INR',
    status: PaymentStatus.CREATED,
    providerPaymentId: null,
    metadata: {},
  } as any;

  beforeAll(() => {
    process.env.STRIPE_RESTRICTED_KEY = 'rk_test_mock';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_secret_mock';
  });

  beforeEach(async () => {
    paymentRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    bookingRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    trekRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    } as any;

    const trekQb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };
    trekRepo.createQueryBuilder.mockReturnValue(trekQb as any);

    ticketService = {
      generateSignedTicket: jest.fn(),
      verifyToken: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn(),
    } as any;

    const mailerService = {
      sendEmail: jest.fn(),
      sendOtpEmail: jest.fn(),
      sendBookingConfirmationEmail: jest.fn(),
      sendPaymentReceiptEmail: jest.fn(),
      sendRefundProcessedEmail: jest.fn(),
      sendTicketEmail: jest.fn(),
      sendNewBookingAlertEmail: jest.fn(),
    } as any;

    const notificationsService = {} as any;

    service = new PaymentsService(
      paymentRepo as any,
      bookingRepo as any,
      trekRepo as any,
      ticketService as any,
      mailerService as any,
      dataSource as any,
      notificationsService,
      mockGatewayRegistry as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckout', () => {
    it('should throw NotFoundException if booking not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCheckout({
          bookingId: 'bad-id',
          provider: PaymentProvider.STRIPE,
          userId: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if booking belongs to other user', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        userId: 'other-user',
      } as any);

      await expect(
        service.createCheckout({
          bookingId: 'booking-1',
          provider: PaymentProvider.STRIPE,
          userId: 'user-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      } as any);

      await expect(
        service.createCheckout({
          bookingId: 'booking-1',
          provider: PaymentProvider.STRIPE,
          userId: 'user-1',
        }),
      ).rejects.toThrow('Booking is not pending');
    });

    it('should return existing payment if idempotency key matches', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      const result = await service.createCheckout({
        bookingId: 'booking-1',
        provider: PaymentProvider.STRIPE,
        idempotencyKey: 'dup-key',
        userId: 'user-1',
      });

      expect(result.duplicate).toBe(true);
      expect(paymentRepo.create).not.toHaveBeenCalled();
    });

    it('should create a payment record (without provider)', async () => {
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      paymentRepo.create.mockReturnValue(mockPayment);
      paymentRepo.save.mockResolvedValue(mockPayment);

      const result = await service.createCheckout({
        bookingId: 'booking-1',
        provider: PaymentProvider.STRIPE,
        userId: 'user-1',
      });

      expect(result.paymentId).toBe('payment-1');
      expect(paymentRepo.create).toHaveBeenCalled();
    });
  });

  describe('handleProviderSuccess', () => {
    it('should confirm booking on successful payment', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      paymentRepo.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      });

      // Mock transaction
      const mockTransactionalRepo = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockBooking),
          save: jest.fn().mockResolvedValue({
            ...mockBooking,
            status: BookingStatus.CONFIRMED,
          }),
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest
              .fn()
              .mockResolvedValue({ id: 'trek-1', name: 'Test Trek' }),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            execute: jest.fn(),
          }),
        }),
      };

      dataSource.transaction.mockImplementation(
        (cb: (em: any) => Promise<any>) => cb(mockTransactionalRepo),
      );

      ticketService.generateSignedTicket.mockResolvedValue({
        token: 'ticket-token',
        issuedAt: 123,
        expiresAt: 456,
      });

      const result = await service.handleProviderSuccess(
        PaymentProvider.STRIPE,
        'pi_123',
        2000,
      );

      expect(result).toBeDefined();
      expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
    });

    it('should return null if payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      const result = await service.handleProviderSuccess(
        PaymentProvider.STRIPE,
        'pi_nonexistent',
        1000,
      );

      expect(result).toBeNull();
    });
  });

  describe('handleProviderFailure', () => {
    it('should mark payment and booking as failed', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      paymentRepo.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });
      bookingRepo.save.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.FAILED,
      });

      const result = await service.handleProviderFailure(
        PaymentProvider.STRIPE,
        'pi_failed',
      );

      expect(result).toBeDefined();
      expect(result.payment.status).toBe(PaymentStatus.FAILED);
      expect(result.booking.status).toBe(BookingStatus.FAILED);
    });

    it('should return null if payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      const result = await service.handleProviderFailure(
        PaymentProvider.STRIPE,
        'pi_nonexistent',
      );

      expect(result).toBeNull();
    });
  });

  describe('refundPayment', () => {
    it('should refund a succeeded payment', async () => {
      const succeededPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
        providerPaymentId: 'pi_123',
      };
      paymentRepo.findOne.mockResolvedValue(succeededPayment);
      paymentRepo.save.mockResolvedValue({
        ...succeededPayment,
        status: PaymentStatus.REFUNDED,
      });
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      bookingRepo.save.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      const result = await service.refundPayment(
        'payment-1',
        'Customer request',
      );

      expect(result.payment.status).toBe(PaymentStatus.REFUNDED);
      expect(result.booking.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.refundPayment('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if payment not succeeded', async () => {
      paymentRepo.findOne.mockResolvedValue(mockPayment);

      await expect(service.refundPayment('payment-1')).rejects.toThrow(
        'Only succeeded payments can be refunded',
      );
    });
  });
});
