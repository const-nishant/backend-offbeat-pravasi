import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { UserRecommendationPreference } from './entities/user-recommendation-preference.entity';
import { RecommendationResult } from './entities/recommendation-result.entity';
import { RecommendationEvent } from './entities/recommendation-event.entity';
import { Trek } from '../treks/entities/trek.entity';
import { TrekTag } from '../treks/entities/trek-tag.entity';
import { FitnessAssessment } from '../assessments/entities/fitness-assessment.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { WishlistCollection } from '../wishlist/entities/wishlist-collection.entity';
import { WishlistItem } from '../wishlist/entities/wishlist-item.entity';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRecommendationPreference,
      RecommendationResult,
      RecommendationEvent,
      Trek,
      TrekTag,
      FitnessAssessment,
      Booking,
      WishlistCollection,
      WishlistItem,
    ]),
    AdminModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
