import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminAuditRetentionService } from './admin-audit-retention.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

class UpdateRetentionDto {
  @IsOptional()
  @IsInt()
  @Min(30)
  retentionDays?: number;

  @IsOptional()
  @IsBoolean()
  exportBeforePurge?: boolean;
}

@ApiTags('Admin / Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminAuditRetentionController {
  constructor(
    private readonly adminAuditRetentionService: AdminAuditRetentionService,
  ) {}

  @Get('stats')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Audit log table stats and retention settings' })
  async getStats() {
    return this.adminAuditRetentionService.getStats();
  }

  @Patch('retention')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Set audit log retention policy' })
  async updateRetention(@Body() dto: UpdateRetentionDto) {
    return this.adminAuditRetentionService.updateRetention(dto);
  }

  @Post('purge-now')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Manually purge audit logs older than retention' })
  async purgeNow() {
    return this.adminAuditRetentionService.purgeNow();
  }
}
