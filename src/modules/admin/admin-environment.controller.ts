import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminEnvironmentService } from './admin-environment.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Environment')
@Controller('admin/environment')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminEnvironmentController {
  constructor(
    private readonly adminEnvironmentService: AdminEnvironmentService,
  ) {}

  @Get('compare')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Side-by-side environment comparison (settings, flags, env vars)',
  })
  async compare() {
    return this.adminEnvironmentService.compare();
  }

  @Get('drift-report')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Historical config change report' })
  async getDriftReport() {
    return this.adminEnvironmentService.getDriftReport();
  }
}
