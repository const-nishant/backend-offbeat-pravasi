import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLog } from './entities/audit-log.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { PlatformSettingsService } from './platform-settings.service';
import { User } from '../users/entities/user.entity';
import { OrganizerModule } from '../organizer/organizer.module';
import { AuditLogService } from './audit-log.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User, PlatformSettings]),
    OrganizerModule,
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
