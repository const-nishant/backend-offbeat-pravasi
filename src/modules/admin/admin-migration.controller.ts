import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminMigrationService } from './admin-migration.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Migrations')
@Controller('admin/migrations')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminMigrationController {
  constructor(private readonly adminMigrationService: AdminMigrationService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all executed migrations' })
  async list() {
    return this.adminMigrationService.list();
  }
}
