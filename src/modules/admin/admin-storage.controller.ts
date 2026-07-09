import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminStorageService } from './admin-storage.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Storage')
@Controller('admin/storage')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminStorageController {
  constructor(private readonly adminStorageService: AdminStorageService) {}

  @Get('summary')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Storage summary per bucket' })
  async getSummary() {
    return this.adminStorageService.getSummary();
  }

  @Get('file-types')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Breakdown by MIME type and bucket' })
  async getFileTypes() {
    return this.adminStorageService.getFileTypes();
  }

  @Get('orphans')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List orphaned media records' })
  async getOrphans() {
    return this.adminStorageService.getOrphans();
  }
}
