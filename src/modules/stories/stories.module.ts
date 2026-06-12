import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';
import { User } from '../users/entities/user.entity';
import { FriendshipsModule } from '../friendships/friendships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Story, StoryView, User]),
    FriendshipsModule,
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService, TypeOrmModule.forFeature([Story])],
})
export class StoriesModule {}
