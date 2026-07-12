import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminDatabaseService } from './admin-database.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Database')
@Controller('admin/database')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminDatabaseController {
  constructor(private readonly adminDatabaseService: AdminDatabaseService) {}

  @Get('health')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get database connection pool health' })
  async getHealth() {
    return this.adminDatabaseService.getHealth();
  }

  @Get('tables')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get per-table statistics (row count, size, dead tuples)',
  })
  async getTables() {
    return this.adminDatabaseService.getTables();
  }

  @Get('indexes')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({
    summary: 'Get index usage statistics (unused/underused indexes)',
  })
  async getIndexes() {
    return this.adminDatabaseService.getIndexes();
  }

  @Get('slow-queries')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get top 10 slow queries from pg_stat_statements' })
  async getSlowQueries() {
    return this.adminDatabaseService.getSlowQueries();
  }
}
