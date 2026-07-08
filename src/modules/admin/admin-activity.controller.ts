import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminActivityService } from './admin-activity.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Activity')
@Controller('admin/activity')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminActivityController {
  constructor(private readonly adminActivityService: AdminActivityService) {}

  @Get('summary')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({
    summary: 'Admin activity summary (actions per admin, totals)',
  })
  async getSummary() {
    return this.adminActivityService.getSummary();
  }

  @Get('heatmap')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Activity heatmap by hour of day and day of week' })
  async getHeatmap() {
    return this.adminActivityService.getHeatmap();
  }

  @Get('recent')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Recent 50 admin actions live feed' })
  async getRecent() {
    return this.adminActivityService.getRecent();
  }
}
