import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminAuditDiffService } from './admin-audit-diff.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Audit Diff')
@Controller('admin/audit-logs')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminAuditDiffController {
  constructor(private readonly adminAuditDiffService: AdminAuditDiffService) {}

  @Get(':resourceType/:resourceId/diff')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Show chronological diffs of a specific resource' })
  async diff(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.adminAuditDiffService.diff(resourceType, resourceId);
  }

  @Get('timeline')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Grouped-by-session timeline view' })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async timeline(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminAuditDiffService.timeline({
      actorId,
      action,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
}
