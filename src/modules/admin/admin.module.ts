import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLog } from './entities/audit-log.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { PlatformSettingsService } from './platform-settings.service';
import { User } from '../users/entities/user.entity';
import { Trek } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { OrganizerApplication } from '../organizer/entities/organizer-application.entity';
import { OrganizerModule } from '../organizer/organizer.module';
import { AuditLogService } from './audit-log.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JobsModule } from '../../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralCode } from '../referrals/entities/referral-code.entity';
import { Referral } from '../referrals/entities/referral.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      PlatformSettings,
      Trek,
      Booking,
      OrganizerApplication,
      ReferralCode,
      Referral,
    ]),
    OrganizerModule,
    JobsModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AuditLogService,
    PlatformSettingsService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService, AuditLogService, PlatformSettingsService],
})
export class AdminModule {}
