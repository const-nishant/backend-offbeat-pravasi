import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminUserMergeService } from './admin-user-merge.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class MergeDto {
  @IsString()
  primaryUserId!: string;

  @IsString()
  mergeUserId!: string;
}

@ApiTags('Admin / User Merge')
@Controller('admin/users/merge')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminUserMergeController {
  constructor(private readonly adminUserMergeService: AdminUserMergeService) {}

  @Post('dry-run')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Preview merge collisions' })
  async dryRun(@Body() dto: MergeDto) {
    return this.adminUserMergeService.dryRun(
      dto.primaryUserId,
      dto.mergeUserId,
    );
  }

  @Post('execute')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Execute user merge in a transaction' })
  async execute(@Body() dto: MergeDto) {
    return this.adminUserMergeService.execute(
      dto.primaryUserId,
      dto.mergeUserId,
    );
  }

  @Get('history')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Past merge operations' })
  async history() {
    return this.adminUserMergeService.history();
  }
}
