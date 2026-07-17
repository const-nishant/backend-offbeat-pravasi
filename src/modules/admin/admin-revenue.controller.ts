import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminRevenueService } from './admin-revenue.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Revenue Share')
@Controller('admin/revenue-share')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminRevenueController {
  constructor(private readonly adminRevenueService: AdminRevenueService) {}

  @Get('overview')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Platform vs organizer revenue overview' })
  async getOverview() {
    return this.adminRevenueService.getOverview();
  }

  @Get('by-trek')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Per-trek revenue breakdown' })
  async getByTrek() {
    return this.adminRevenueService.getByTrek();
  }

  @Get('by-organizer')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Per-organizer revenue breakdown' })
  async getByOrganizer() {
    return this.adminRevenueService.getByOrganizer();
  }
}
