import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { FeatureFlagService } from './feature-flag.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

class CreateFlagDto {
  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsString()
  userSegment?: string;
}

class UpdateFlagDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsString()
  userSegment?: string | null;
}

@ApiTags('Admin / Feature Flags')
@Controller('admin/feature-flags')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminFeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'List all feature flags' })
  async list() {
    return this.featureFlagService.list();
  }

  @Get(':id')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Get feature flag by id' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureFlagService.get(id);
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a new feature flag' })
  async create(@Body() dto: CreateFlagDto) {
    return this.featureFlagService.create(dto);
  }

  @Patch(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a feature flag' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFlagDto) {
    return this.featureFlagService.update(id, dto);
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a feature flag' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureFlagService.delete(id);
  }
}
