import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminSecurityService } from './admin-security.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Security')
@Controller('admin/security')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminSecurityController {
  constructor(private readonly adminSecurityService: AdminSecurityService) {}

  @Get('failed-logins')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'List failed login attempts with filters' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'ip', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async listFailedLogins(
    @Query('userId') userId?: string,
    @Query('ip') ip?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminSecurityService.listFailedLogins({
      userId,
      ip,
      from,
      to,
    });
  }

  @Get('failed-logins/summary')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Summary of failed logins: top IPs, users, trend' })
  async getSummary() {
    return this.adminSecurityService.getSummary();
  }
}
