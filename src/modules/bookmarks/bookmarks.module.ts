import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { Bookmark } from './entities/bookmark.entity';
import { Trek } from '../treks/entities/trek.entity';
import { TrekInteraction } from '../treks/entities/trek-interaction.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Trek, TrekInteraction, User])],
  controllers: [BookmarksController],
  providers: [BookmarksService],
  exports: [BookmarksService],
})
export class BookmarksModule {}
