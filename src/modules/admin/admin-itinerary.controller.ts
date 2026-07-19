import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminItineraryService } from './admin-itinerary.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DayDto {
  @IsInt()
  dayNumber!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  activities?: string;

  @IsOptional()
  @IsString()
  accommodation?: string;

  @IsOptional()
  @IsString()
  meals?: string;
}

class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayDto)
  days!: DayDto[];
}

class ApplyDto {
  @IsUUID()
  trekId!: string;
}

@ApiTags('Admin / Itinerary Templates')
@Controller('admin/itinerary-templates')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminItineraryController {
  constructor(private readonly adminItineraryService: AdminItineraryService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List itinerary templates' })
  async list() {
    return this.adminItineraryService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create itinerary template with days' })
  async create(@Body() dto: CreateTemplateDto) {
    return this.adminItineraryService.create(dto);
  }

  @Post(':id/apply-to-trek')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Apply template to a trek (deep-copy days)' })
  async applyToTrek(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApplyDto) {
    return this.adminItineraryService.applyToTrek(id, dto.trekId);
  }
}
