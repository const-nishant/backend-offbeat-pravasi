import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminPayoutService } from './admin-payout.service';
import { PayoutStatus } from './entities/payout.entity';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt } from 'class-validator';

@ApiTags('Admin / Payouts')
@Controller('admin/payouts')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminPayoutController {
  constructor(private readonly adminPayoutService: AdminPayoutService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'List payouts with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'organizerId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('status') status?: PayoutStatus,
    @Query('organizerId') organizerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminPayoutService.list({
      status,
      organizerId,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('summary')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Payout summary statistics' })
  async summary() {
    return this.adminPayoutService.summary();
  }

  @Post(':id/approve')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Approve a payout for processing' })
  async approve(@Param('id') id: string) {
    return this.adminPayoutService.approve(id);
  }

  @Post(':id/mark-settled')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Mark a payout as settled (manual transfer)' })
  async markSettled(@Param('id') id: string) {
    return this.adminPayoutService.markSettled(id);
  }
}
