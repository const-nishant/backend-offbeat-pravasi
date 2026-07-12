import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminMigrationService } from './admin-migration.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Migrations')
@Controller('admin/migrations')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminMigrationController {
  constructor(private readonly adminMigrationService: AdminMigrationService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all executed migrations' })
  async list() {
    return this.adminMigrationService.list();
  }
}
