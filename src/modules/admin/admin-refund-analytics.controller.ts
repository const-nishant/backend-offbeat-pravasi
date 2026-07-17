import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminRefundAnalyticsService } from './admin-refund-analytics.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Refund Analytics')
@Controller('admin/analytics/refunds')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminRefundAnalyticsController {
  constructor(
    private readonly adminRefundAnalyticsService: AdminRefundAnalyticsService,
  ) {}

  @Get('overview')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Refund overview statistics' })
  async overview() {
    return this.adminRefundAnalyticsService.overview();
  }

  @Get('by-trek')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Per-trek refund stats' })
  async byTrek() {
    return this.adminRefundAnalyticsService.byTrek();
  }

  @Get('by-organizer')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Per-organizer refund stats' })
  async byOrganizer() {
    return this.adminRefundAnalyticsService.byOrganizer();
  }

  @Get('by-user')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Users with high refund rates (abuse candidates)' })
  async byUser() {
    return this.adminRefundAnalyticsService.byUser();
  }

  @Get('trend')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Monthly refund rate trend (12 months)' })
  async trend() {
    return this.adminRefundAnalyticsService.trend();
  }
}
