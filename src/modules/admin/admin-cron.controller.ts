import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminCronService } from './admin-cron.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Cron Jobs')
@Controller('admin/cron-jobs')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminCronController {
  constructor(private readonly adminCronService: AdminCronService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all repeatable cron jobs' })
  async listCronJobs() {
    return this.adminCronService.listCronJobs();
  }

  @Post(':key/disable')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Disable a repeatable cron job' })
  async disableCronJob(@Param('key') key: string) {
    return this.adminCronService.disableCronJob(key);
  }

  @Post(':key/enable')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Enable a previously disabled cron job' })
  async enableCronJob(@Param('key') key: string) {
    return this.adminCronService.enableCronJob(key);
  }

  @Post(':key/trigger-now')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Manually trigger an immediate run of a cron job' })
  async triggerNow(@Param('key') key: string) {
    return this.adminCronService.triggerNow(key);
  }
}
