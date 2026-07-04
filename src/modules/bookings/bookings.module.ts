import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Payment } from './entities/payment.entity';
import { Trek } from '../treks/entities/trek.entity';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PoliciesModule } from '../policies/policies.module';
import { PlatformSettingsModule } from '../admin/platform-settings.module';
import { TicketService } from './ticket.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, Trek]),
    forwardRef(() => AdminModule),
    PlatformSettingsModule,
    NotificationsModule,
    PoliciesModule,
    JwtModule.register({
      global: false,
      secret: process.env.JWT_TICKET_SECRET ?? 'dev_ticket_secret',
      signOptions: {
        expiresIn: process.env.JWT_TICKET_TTL as number | undefined,
      },
    }),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, TicketService],
  exports: [BookingsService, TicketService],
})
export class BookingsModule {}
