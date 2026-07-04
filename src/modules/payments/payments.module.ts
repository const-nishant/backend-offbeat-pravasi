import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from '../bookings/entities/payment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Trek } from '../treks/entities/trek.entity';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StripeAdapter } from './providers/stripe.adapter';
import { RazorpayAdapter } from './providers/razorpay.adapter';
import { GatewayRegistry } from './providers/gateway-registry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Booking, Trek]),
    BookingsModule,
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeAdapter, RazorpayAdapter, GatewayRegistry],
  exports: [PaymentsService, GatewayRegistry],
})
export class PaymentsModule {}
