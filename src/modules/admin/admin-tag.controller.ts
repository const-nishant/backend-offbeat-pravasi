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
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminTagService } from './admin-tag.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

class CreateTagDto {
  @IsString()
  name!: string;
}

class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  description?: string | null;
}

class UpdateTrekTagsDto {
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}

@ApiTags('Admin / Treks')
@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminTagController {
  constructor(private readonly adminTagService: AdminTagService) {}

  @Get('tags')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List all trek tags' })
  async listTags() {
    return this.adminTagService.listTags();
  }

  @Post('tags')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a trek tag' })
  async createTag(@Body() dto: CreateTagDto) {
    return this.adminTagService.createTag(dto.name);
  }

  @Delete('tags/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a trek tag' })
  async deleteTag(@Param('id') id: string) {
    return this.adminTagService.deleteTag(id);
  }

  @Get('categories')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List all trek categories' })
  async listCategories() {
    return this.adminTagService.listCategories();
  }

  @Post('categories')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a trek category' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminTagService.createCategory(dto);
  }

  @Patch('categories/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a trek category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminTagService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a trek category' })
  async deleteCategory(@Param('id') id: string) {
    return this.adminTagService.deleteCategory(id);
  }

  @Post('treks/:id/tags')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Batch-update trek tags' })
  async updateTrekTags(
    @Param('id') id: string,
    @Body() dto: UpdateTrekTagsDto,
  ) {
    return this.adminTagService.updateTrekTags(id, dto.tagIds);
  }
}
