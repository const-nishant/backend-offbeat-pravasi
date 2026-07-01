import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistCollection } from './entities/wishlist-collection.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { Trek } from '../treks/entities/trek.entity';
import { TrekInteraction } from '../treks/entities/trek-interaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WishlistCollection,
      WishlistItem,
      Trek,
      TrekInteraction,
    ]),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
