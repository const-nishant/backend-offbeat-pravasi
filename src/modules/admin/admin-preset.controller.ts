import {
  Controller,
  Get,
  Post,
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
import { AdminPresetService } from './admin-preset.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

class SavePresetDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  description!: string;
}

@ApiTags('Admin / Platform Settings')
@Controller('admin/platform-settings/presets')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminPresetController {
  constructor(private readonly adminPresetService: AdminPresetService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all platform settings presets' })
  async list() {
    return this.adminPresetService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Save current settings as a preset' })
  async save(@Body() dto: SavePresetDto) {
    return this.adminPresetService.save(dto.name, dto.description);
  }

  @Post(':id/apply')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Apply a preset (overwrites current settings)' })
  async apply(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminPresetService.apply(id);
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a custom preset (cannot delete built-in)' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminPresetService.delete(id);
  }
}
