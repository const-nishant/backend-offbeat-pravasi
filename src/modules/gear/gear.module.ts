import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GearController } from './gear.controller';
import { GearService } from './gear.service';
import { GearItem } from './entities/gear-item.entity';
import { TrekGearItem } from './entities/trek-gear-item.entity';
import { UserPackingListItem } from './entities/user-packing-list-item.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GearItem,
      TrekGearItem,
      UserPackingListItem,
      Trek,
      Booking,
    ]),
  ],
  controllers: [GearController],
  providers: [GearService],
  exports: [GearService],
})
export class GearModule {}
