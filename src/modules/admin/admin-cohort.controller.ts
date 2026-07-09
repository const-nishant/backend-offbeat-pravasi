import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminCohortService } from './admin-cohort.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';

class BuildCohortDto {
  @IsOptional()
  @IsInt()
  minTreks?: number;

  @IsOptional()
  @IsString()
  lastBookingBefore?: string;

  @IsOptional()
  @IsString()
  lastBookingAfter?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @IsOptional()
  @IsBoolean()
  isOrganizer?: boolean;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  @IsOptional()
  @IsString()
  format?: string;
}

@ApiTags('Admin / Cohorts')
@Controller('admin/cohorts')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminCohortController {
  constructor(
    private readonly adminCohortService: AdminCohortService,
  ) {}

  @Post('build')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Build and export a user cohort segment' })
  async build(@Body() dto: BuildCohortDto) {
    return this.adminCohortService.build(dto);
  }

  @Get('history')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Past cohort export history' })
  async history() {
    return this.adminCohortService.history();
  }
}
