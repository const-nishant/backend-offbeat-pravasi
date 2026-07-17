import {
  Controller,
  Get,
  Post,
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
import { AdminApiKeyService } from './admin-api-key.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}

@ApiTags('Admin / API Keys')
@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminApiKeyController {
  constructor(private readonly adminApiKeyService: AdminApiKeyService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all API keys (without key value)' })
  async list() {
    return this.adminApiKeyService.list();
  }

  @Get(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get API key details' })
  async get(@Param('id') id: string) {
    return this.adminApiKeyService.get(id);
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a new API key (returns key once)' })
  async create(@Body() dto: CreateApiKeyDto) {
    return this.adminApiKeyService.create({
      name: dto.name,
      permissions: dto.permissions,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Patch(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update API key metadata' })
  async update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.adminApiKeyService.update(id, {
      name: dto.name,
      permissions: dto.permissions,
      expiresAt:
        dto.expiresAt !== undefined
          ? dto.expiresAt
            ? new Date(dto.expiresAt)
            : null
          : undefined,
    });
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(@Param('id') id: string) {
    return this.adminApiKeyService.revoke(id);
  }

  @Post(':id/rotate')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Rotate API key (returns new key once)' })
  async rotate(@Param('id') id: string) {
    return this.adminApiKeyService.rotate(id);
  }
}
