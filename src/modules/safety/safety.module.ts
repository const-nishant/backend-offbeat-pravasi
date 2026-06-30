import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
import { TrekSafetyInfo } from './entities/trek-safety-info.entity';
import { UserEmergencyContact } from './entities/user-emergency-contact.entity';
import { TrekCheckIn } from './entities/trek-check-in.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrekSafetyInfo,
      UserEmergencyContact,
      TrekCheckIn,
      Trek,
      Booking,
    ]),
    NotificationsModule,
  ],
  controllers: [SafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
