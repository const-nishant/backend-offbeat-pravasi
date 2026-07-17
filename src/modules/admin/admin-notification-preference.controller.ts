import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminNotificationPreferenceService } from './admin-notification-preference.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PrefEntry {
  @IsString()
  eventType!: string;

  @IsString()
  channel!: string;

  @IsBoolean()
  enabled!: boolean;
}

class UpdatePrefsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrefEntry)
  preferences!: PrefEntry[];
}

@ApiTags('Admin / Notification Preferences')
@Controller('admin/notifications/preferences')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminNotificationPreferenceController {
  constructor(
    private readonly adminNotificationPreferenceService: AdminNotificationPreferenceService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Get current admin notification preferences' })
  async get() {
    return this.adminNotificationPreferenceService.getPreferences('00000000-0000-0000-0000-000000000000');
  }

  @Patch()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Update notification preferences' })
  async update(@Body() dto: UpdatePrefsDto) {
    return this.adminNotificationPreferenceService.update('00000000-0000-0000-0000-000000000000', dto.preferences);
  }

  @Post('test')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Send test notification on configured channels' })
  async test() {
    return this.adminNotificationPreferenceService.test('00000000-0000-0000-0000-000000000000');
  }
}
