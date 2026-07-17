import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminDataExportService } from './admin-data-export.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class RejectDto {
  @IsString()
  reason!: string;
}

@ApiTags('Admin / Data Export')
@Controller('admin/data-exports')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminDataExportController {
  constructor(
    private readonly adminDataExportService: AdminDataExportService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List data export requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminDataExportService.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post(':id/approve')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Approve and start processing data export' })
  async approve(@Param('id') id: string) {
    return this.adminDataExportService.approve(id, '00000000-0000-0000-0000-000000000000');
  }

  @Post(':id/reject')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reject data export with reason' })
  async reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.adminDataExportService.reject(id, dto.reason);
  }

  @Get(':id/log')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get export details including file info' })
  async getLog(@Param('id') id: string) {
    return this.adminDataExportService.getLog(id);
  }
}
