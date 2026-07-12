import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminCalendarService } from './admin-calendar.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Calendar')
@Controller('admin/marketing/calendar')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminCalendarController {
  constructor(private readonly adminCalendarService: AdminCalendarService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Aggregated marketing calendar' })
  async calendar() {
    return this.adminCalendarService.getCalendar();
  }
}
