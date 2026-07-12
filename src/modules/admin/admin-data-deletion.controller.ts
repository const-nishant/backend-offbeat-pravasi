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
import { AdminDataDeletionService } from './admin-data-deletion.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class RejectDto {
  @IsString()
  reason!: string;
}

@ApiTags('Admin / Data Deletion')
@Controller('admin/data-deletion')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminDataDeletionController {
  constructor(
    private readonly adminDataDeletionService: AdminDataDeletionService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List data deletion requests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminDataDeletionService.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post(':id/approve')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Approve data deletion request' })
  async approve(@Param('id') id: string) {
    return this.adminDataDeletionService.approve(
      id,
      '00000000-0000-0000-0000-000000000000',
    );
  }

  @Post(':id/reject')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reject data deletion with reason' })
  async reject(@Param('id') id: string, @Body() dto: RejectDto) {
    return this.adminDataDeletionService.reject(id, dto.reason);
  }
}
