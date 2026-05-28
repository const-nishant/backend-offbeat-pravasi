import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreksController } from './treks.controller';
import { TreksService } from './treks.service';
import { Trek } from './entities/trek.entity';
import { TrekImage } from './entities/trek-image.entity';
import { TrekTag } from './entities/trek-tag.entity';
import { TrekReview } from './entities/trek-review.entity';
import { TrekInteraction } from './entities/trek-interaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trek,
      TrekImage,
      TrekTag,
      TrekReview,
      TrekInteraction,
    ]),
  ],
  controllers: [TreksController],
  providers: [TreksService],
  exports: [TreksService, TypeOrmModule.forFeature([Trek])],
})
export class TreksModule {}
