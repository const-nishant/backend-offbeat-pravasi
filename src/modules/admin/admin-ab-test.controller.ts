import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminAbTestService } from './admin-ab-test.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VariantDto {
  @IsString()
  name!: string;

  @IsNumber()
  percentage!: number;
}

class CreateAbTestDto {
  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants!: VariantDto[];

  @IsOptional()
  @IsString()
  audienceSegment?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

class ConcludeDto {
  @IsString()
  winnerVariant!: string;
}

@ApiTags('Admin / A/B Tests')
@Controller('admin/ab-tests')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminAbTestController {
  constructor(private readonly adminAbTestService: AdminAbTestService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List A/B tests' })
  async list() {
    return this.adminAbTestService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create an A/B test' })
  async create(@Body() dto: CreateAbTestDto) {
    return this.adminAbTestService.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Get(':id/results')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get A/B test results' })
  async results(@Param('id') id: string) {
    return this.adminAbTestService.results(id);
  }

  @Post(':id/conclude')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Conclude A/B test with winner' })
  async conclude(@Param('id') id: string, @Body() dto: ConcludeDto) {
    return this.adminAbTestService.conclude(id, dto.winnerVariant);
  }
}
