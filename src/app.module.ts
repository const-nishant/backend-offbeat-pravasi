import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ormConfig } from './config/ormconfig';
import configuration from './config/configuration';
import { RedisModule } from './common/modules/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TreksModule } from './modules/treks/treks.module';

import { FriendshipsModule } from './modules/friendships/friendships.module';
import { OrganizerModule } from './modules/organizer/organizer.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { JobsModule } from './jobs/jobs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ItinerariesModule } from './modules/itineraries/itineraries.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { GearModule } from './modules/gear/gear.module';
import { WeatherModule } from './modules/weather/weather.module';
import { SafetyModule } from './modules/safety/safety.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 90000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRoot(ormConfig),
    RedisModule,
    MailerModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TreksModule,
    FriendshipsModule,
    OrganizerModule,
    AdminModule,
    MediaModule,
    LeaderboardModule,
    NotificationsModule,
    BookingsModule,
    PaymentsModule,
    JobsModule,
    ReportsModule,
    ItinerariesModule,
    PoliciesModule,
    GearModule,
    WeatherModule,
    SafetyModule,
    AssessmentsModule,
    GroupsModule,
    ReferralsModule,
    WishlistModule,
    RecommendationsModule,
  ],
  providers: [
    // global guards
    { provide: APP_GUARD, useClass: ApiKeyGuard },

    // Global exception filters: AllExceptionsFilter handles validation + everything else
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
