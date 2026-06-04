import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { OrganizerModule } from '../organizer/organizer.module';
import { AuditLogService } from './audit-log.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User]), OrganizerModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AdminService, AuditLogService],
})
export class AdminModule {}
