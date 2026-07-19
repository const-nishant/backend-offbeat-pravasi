import {
  Controller,
  Get,
  Patch,
  Delete,
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
import { AdminGearService } from './admin-gear.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

class DecisionDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Admin / Gear')
@Controller('admin/gear')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminGearController {
  constructor(private readonly adminGearService: AdminGearService) {}

  @Get('pending')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List pending gear items' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listPending(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminGearService.listPending(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch(':id/decision')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Approve or reject a gear item' })
  async decide(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto) {
    return this.adminGearService.decide(id, dto.decision, dto.reason);
  }

  @Patch(':id/featured')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Toggle featured status' })
  async toggleFeatured(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminGearService.toggleFeatured(id);
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Soft-delete a gear item' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminGearService.softDelete(id);
  }
}
