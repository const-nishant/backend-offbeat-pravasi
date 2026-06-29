import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesService } from './itineraries.service';
import { ItineraryDay } from './entities/itinerary-day.entity';
import { Trek } from '../treks/entities/trek.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ItineraryDay, Trek])],
  controllers: [ItinerariesController],
  providers: [ItinerariesService],
  exports: [ItinerariesService],
})
export class ItinerariesModule {}
