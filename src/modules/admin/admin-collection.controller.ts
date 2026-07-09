import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminCollectionService } from './admin-collection.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

class CreateCollectionDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trekIds?: string[];

  @IsOptional()
  @IsString()
  coverImage?: string;
}

class UpdateTreksDto {
  @IsArray()
  @IsString({ each: true })
  trekIds!: string[];
}

@ApiTags('Admin / Collections')
@Controller('admin/collections')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminCollectionController {
  constructor(
    private readonly adminCollectionService: AdminCollectionService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List all trek collections with count' })
  async list() {
    return this.adminCollectionService.list();
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a featured collection' })
  async create(@Body() dto: CreateCollectionDto) {
    return this.adminCollectionService.create(dto);
  }

  @Patch(':id/treks')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reorder or replace treks in a collection' })
  async updateTreks(@Param('id') id: string, @Body() dto: UpdateTreksDto) {
    return this.adminCollectionService.updateTreks(id, dto.trekIds);
  }
}
