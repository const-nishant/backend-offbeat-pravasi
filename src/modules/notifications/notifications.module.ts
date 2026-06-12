import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ExpoPushProvider } from './providers/expo-push.provider';
import { WebPushProvider } from './providers/web-push.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeviceToken, Notification, User]),
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ExpoPushProvider, WebPushProvider],
  exports: [NotificationsService, ExpoPushProvider, WebPushProvider],
})
export class NotificationsModule {}
