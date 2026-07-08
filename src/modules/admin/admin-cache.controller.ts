import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminCacheService } from './admin-cache.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Cache')
@Controller('admin/cache')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminCacheController {
  constructor(private readonly adminCacheService: AdminCacheService) {}

  @Post('invalidate')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Invalidate cache keys matching a pattern' })
  async invalidate(@Body() body: { pattern: string }) {
    return this.adminCacheService.invalidate(body.pattern);
  }

  @Get('stats')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get Redis cache memory stats' })
  async getStats() {
    return this.adminCacheService.getStats();
  }

  @Get('keys')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List cache keys by pattern with TTL' })
  @ApiQuery({ name: 'pattern', required: true })
  async getKeys(@Query('pattern') pattern: string) {
    return this.adminCacheService.getKeys(pattern);
  }
}
