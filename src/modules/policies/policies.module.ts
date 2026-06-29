import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { CancellationPolicy } from './entities/cancellation-policy.entity';
import { CancellationTier } from './entities/cancellation-tier.entity';
import { TrekPolicy } from './entities/trek-policy.entity';
import { BookingPolicySnapshot } from './entities/booking-policy-snapshot.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CancellationPolicy,
      CancellationTier,
      TrekPolicy,
      BookingPolicySnapshot,
      Booking,
    ]),
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
