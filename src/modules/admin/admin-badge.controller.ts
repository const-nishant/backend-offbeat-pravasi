import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminBadgeService } from './admin-badge.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

class CreateBadgeDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  criteria?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isAutoAwardable?: boolean;
}

class UpdateBadgeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  criteria?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isAutoAwardable?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class AwardBadgeDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Admin / Badges')
@Controller('admin/badges')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminBadgeController {
  constructor(private readonly adminBadgeService: AdminBadgeService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List all badges' })
  async list() {
    return this.adminBadgeService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a badge' })
  async create(@Body() dto: CreateBadgeDto) {
    return this.adminBadgeService.create(dto);
  }

  @Patch(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a badge' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBadgeDto,
  ) {
    return this.adminBadgeService.update(id, dto);
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a badge' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminBadgeService.remove(id);
  }

  @Post(':id/award')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Manually award badge to a user' })
  async award(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AwardBadgeDto,
    // TODO: Inject current admin user for awardedBy
  ) {
    return this.adminBadgeService.award(
      id,
      dto.userId,
      '00000000-0000-0000-0000-000000000000',
      dto.reason,
    );
  }

  @Post(':id/revoke')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Revoke badge from a user' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AwardBadgeDto,
  ) {
    return this.adminBadgeService.revoke(id, dto.userId);
  }

  @Get('stats')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Per-badge award statistics' })
  async stats() {
    return this.adminBadgeService.stats();
  }
}
