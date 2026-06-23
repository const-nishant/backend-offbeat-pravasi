import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizerApplication } from './entities/organizer-application.entity';
import { OrganizerController } from './organizer.controller';
import { OrganizerService } from './organizer.service';
import { User } from '../users/entities/user.entity';
import { Trek } from '../treks/entities/trek.entity';
import { TrekReview } from '../treks/entities/trek-review.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../bookings/entities/payment.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizerApplication,
      User,
      Trek,
      TrekReview,
      Booking,
      Payment,
    ]),
    NotificationsModule,
  ],
  controllers: [OrganizerController],
  providers: [OrganizerService],
  exports: [OrganizerService],
})
export class OrganizerModule {}
