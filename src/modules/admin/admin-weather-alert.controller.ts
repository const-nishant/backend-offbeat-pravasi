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
import { AdminWeatherAlertService } from './admin-weather-alert.service';
import { AlertSeverity } from './entities/weather-alert.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';

class CreateAlertDto {
  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsOptional()
  @IsObject()
  affectedRegion?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@ApiTags('Admin / Weather')
@Controller('admin/weather/alerts')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminWeatherAlertController {
  constructor(
    private readonly adminWeatherAlertService: AdminWeatherAlertService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List all weather alerts' })
  async list() {
    return this.adminWeatherAlertService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a weather alert' })
  async create(@Body() dto: CreateAlertDto) {
    return this.adminWeatherAlertService.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Delete(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Expire a weather alert early' })
  async expire(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminWeatherAlertService.expire(id);
  }
}
