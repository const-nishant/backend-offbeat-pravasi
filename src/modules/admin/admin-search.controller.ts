import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminSearchService } from './admin-search.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

class UpdateSearchSettingsDto {
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

@ApiTags('Admin / Search')
@Controller('admin/search')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminSearchController {
  constructor(private readonly adminSearchService: AdminSearchService) {}

  @Get('indexes')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List search indexes' })
  async listIndexes() {
    return this.adminSearchService.listIndexes();
  }

  @Post('indexes/:name/reindex')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Trigger full reindex' })
  async reindex(@Param('name') name: string) {
    return this.adminSearchService.reindex(name);
  }

  @Patch('indexes/:name/settings')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update search index settings' })
  async updateSettings(
    @Param('name') name: string,
    @Body() dto: UpdateSearchSettingsDto,
  ) {
    return this.adminSearchService.updateSettings(name, dto.settings ?? {});
  }
}
