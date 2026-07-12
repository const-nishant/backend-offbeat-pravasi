import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminTaxService } from './admin-tax.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

@ApiTags('Admin / Tax')
@Controller('admin/tax')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminTaxController {
  constructor(private readonly adminTaxService: AdminTaxService) {}

  @Get('report')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE)
  @ApiOperation({ summary: 'Get tax/GST report for a period' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async report(@Query('from') from: string, @Query('to') to: string) {
    return this.adminTaxService.report(from, to);
  }
}
