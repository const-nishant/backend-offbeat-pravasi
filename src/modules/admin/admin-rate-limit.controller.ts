import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminRateLimitService } from './admin-rate-limit.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsInt, Min } from 'class-validator';

class UpdateRateLimitDto {
  @IsString()
  endpoint!: string;

  @IsInt()
  @Min(1000)
  windowMs!: number;

  @IsInt()
  @Min(1)
  maxRequests!: number;
}

@ApiTags('Admin / Security')
@Controller('admin/security/rate-limits')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminRateLimitController {
  constructor(private readonly adminRateLimitService: AdminRateLimitService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get current rate limit configuration' })
  async getConfig() {
    return this.adminRateLimitService.getConfig();
  }

  @Patch()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Set rate limit override (expires in 24h)' })
  async updateOverride(@Body() dto: UpdateRateLimitDto) {
    return this.adminRateLimitService.updateOverride(dto);
  }

  @Delete(':endpoint')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Clear rate limit override for an endpoint' })
  async clearOverride(@Param('endpoint') endpoint: string) {
    return this.adminRateLimitService.clearOverride(endpoint);
  }
}
