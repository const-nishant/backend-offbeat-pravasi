import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TreksModule } from './modules/treks/treks.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PostsModule } from './modules/posts/posts.module';
import { StoriesModule } from './modules/stories/stories.module';
import { FriendshipsModule } from './modules/friendships/friendships.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { OrganizerModule } from './modules/organizer/organizer.module';
import { MediaModule } from './modules/media/media.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TreksModule,
    BookingsModule,
    PaymentsModule,
    PostsModule,
    StoriesModule,
    FriendshipsModule,
    BookmarksModule,
    NotificationsModule,
    LeaderboardModule,
    OrganizerModule,
    MediaModule,
    AdminModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule {}
