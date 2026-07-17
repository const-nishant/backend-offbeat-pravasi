import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminUserTimelineService } from './admin-user-timeline.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Users')
@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminUserTimelineController {
  constructor(
    private readonly adminUserTimelineService: AdminUserTimelineService,
  ) {}

  @Get(':id/timeline')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.SUPPORT)
  @ApiOperation({
    summary: 'Unified chronological activity timeline for a user',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTimeline(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminUserTimelineService.getTimeline(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }
}
