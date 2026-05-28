import 'tsconfig-paths/register';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { swaggerDocumentOptions } from './config/swagger.config';
import { AdminController } from './modules/admin/admin.controller';
import { AdminService } from './modules/admin/admin.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { BookingsController } from './modules/bookings/bookings.controller';
import { BookingsService } from './modules/bookings/bookings.service';
import { BookmarksController } from './modules/bookmarks/bookmarks.controller';
import { BookmarksService } from './modules/bookmarks/bookmarks.service';
import { FriendshipsController } from './modules/friendships/friendships.controller';
import { FriendshipsService } from './modules/friendships/friendships.service';
import { HealthController } from './modules/health/health.controller';
import { HealthService } from './modules/health/health.service';
import { LeaderboardController } from './modules/leaderboard/leaderboard.controller';
import { LeaderboardService } from './modules/leaderboard/leaderboard.service';
import { MediaController } from './modules/media/media.controller';
import { MediaService } from './modules/media/media.service';
import { NotificationsController } from './modules/notifications/notifications.controller';
import { NotificationsService } from './modules/notifications/notifications.service';
import { OrganizerController } from './modules/organizer/organizer.controller';
import { OrganizerService } from './modules/organizer/organizer.service';
import { PaymentsController } from './modules/payments/payments.controller';
import { PaymentsService } from './modules/payments/payments.service';
import { PostsController } from './modules/posts/posts.controller';
import { PostsService } from './modules/posts/posts.service';
import { StoriesController } from './modules/stories/stories.controller';
import { StoriesService } from './modules/stories/stories.service';
import { TreksController } from './modules/treks/treks.controller';
import { TreksService } from './modules/treks/treks.service';
import { UsersController } from './modules/users/users.controller';
import { UsersService } from './modules/users/users.service';

const controllers = [
  AppController,
  AdminController,
  AuthController,
  BookingsController,
  BookmarksController,
  FriendshipsController,
  HealthController,
  LeaderboardController,
  MediaController,
  NotificationsController,
  OrganizerController,
  PaymentsController,
  PostsController,
  StoriesController,
  TreksController,
  UsersController,
];

const providers = [
  { provide: AppService, useValue: { getHello: () => 'Hello World!' } },
  { provide: AdminService, useValue: {} },
  { provide: AuthService, useValue: {} },
  { provide: BookingsService, useValue: {} },
  { provide: BookmarksService, useValue: {} },
  { provide: FriendshipsService, useValue: {} },
  { provide: HealthService, useValue: {} },
  { provide: LeaderboardService, useValue: {} },
  { provide: MediaService, useValue: {} },
  { provide: NotificationsService, useValue: {} },
  { provide: OrganizerService, useValue: {} },
  { provide: PaymentsService, useValue: {} },
  { provide: PostsService, useValue: {} },
  { provide: StoriesService, useValue: {} },
  { provide: TreksService, useValue: {} },
  { provide: UsersService, useValue: {} },
  {
    provide: 'REDIS_CLIENT',
    useValue: {
      ping: async () => 'PONG',
    },
  },
];

@Module({
  controllers,
  providers,
})
class SwaggerDocsModule {}

async function generateSwaggerDocs(): Promise<void> {
  const app = await NestFactory.create(SwaggerDocsModule, { logger: false });
  const document = SwaggerModule.createDocument(app, swaggerDocumentOptions);

  const docsPath = join(process.cwd(), 'docs');
  await mkdir(docsPath, { recursive: true });
  await writeFile(
    join(docsPath, 'swagger.json'),
    JSON.stringify(document, null, 2),
    {
      encoding: 'utf8',
      flag: 'w',
    },
  );

  await app.close();
}

generateSwaggerDocs().catch((error) => {
  console.error('Failed to generate Swagger document:', error);
  process.exit(1);
});
