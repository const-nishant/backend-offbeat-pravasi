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
import { AdminEmailTemplateService } from './admin-email-template.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  subject!: string;

  @IsString()
  bodyHtml!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Admin / Email Templates')
@Controller('admin/email-templates')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminEmailTemplateController {
  constructor(
    private readonly adminEmailTemplateService: AdminEmailTemplateService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List all email templates' })
  async list() {
    return this.adminEmailTemplateService.list();
  }

  @Get(':id')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Get a single email template' })
  async get(@Param('id') id: string) {
    return this.adminEmailTemplateService.get(id);
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create an email template' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.adminEmailTemplateService.create(dto);
  }

  @Patch(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update an email template (creates version)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.adminEmailTemplateService.update(id, dto);
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete an email template' })
  async remove(@Param('id') id: string) {
    return this.adminEmailTemplateService.remove(id);
  }

  @Post(':id/preview')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Preview rendered template' })
  async preview(@Param('id') id: string) {
    return this.adminEmailTemplateService.preview(id);
  }

  @Get(':id/versions')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get version history with diffs' })
  async getVersions(@Param('id') id: string) {
    return this.adminEmailTemplateService.getVersions(id);
  }
}
