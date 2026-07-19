import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminSafetyService } from './admin-safety.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

class ResolveIncidentDto {
  @IsString()
  note!: string;
}

@ApiTags('Admin / Safety')
@Controller('admin/safety')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminSafetyController {
  constructor(private readonly adminSafetyService: AdminSafetyService) {}

  @Get('incidents')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({
    summary: 'List safety incidents (overdue check-ins, escalations)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listIncidents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminSafetyService.listIncidents(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('incidents/:id')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Get full incident detail' })
  async getIncident(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminSafetyService.getIncident(id);
  }

  @Patch('incidents/:id/resolve')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Resolve a safety incident' })
  async resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveIncidentDto) {
    return this.adminSafetyService.resolve(id, dto.note);
  }
}
