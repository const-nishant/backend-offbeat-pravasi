import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminSlaService } from './admin-sla.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';

@ApiTags('Admin / SLA')
@Controller('admin/sla')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminSlaController {
  constructor(
    private readonly adminSlaService: AdminSlaService,
  ) {}

  @Get('overview')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Per-category SLA overview' })
  async overview() {
    return this.adminSlaService.overview();
  }

  @Get('by-admin')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Per-admin SLA performance' })
  async byAdmin() {
    return this.adminSlaService.byAdmin();
  }

  @Get('breaches')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Tasks breaching SLA threshold' })
  @ApiQuery({ name: 'thresholdHours', required: false })
  async breaches(@Query('thresholdHours') thresholdHours?: string) {
    return this.adminSlaService.breaches(thresholdHours ? Number(thresholdHours) : undefined);
  }
}
