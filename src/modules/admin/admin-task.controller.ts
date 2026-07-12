import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminTaskService } from './admin-task.service';
import { TaskStatus, TaskPriority } from './entities/admin-task.entity';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

class CreateTaskDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueBy?: string;
}

class AssignTaskDto {
  @IsString()
  assignedTo!: string;
}

class UpdateStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}

@ApiTags('Admin / Tasks')
@Controller('admin/tasks')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminTaskController {
  constructor(private readonly adminTaskService: AdminTaskService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List tasks with filters' })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: TaskStatus,
    @Query('type') type?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminTaskService.list({
      assignedTo,
      status,
      type,
      priority,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('mine')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Current admin open tasks' })
  async mine() {
    return this.adminTaskService.mine('00000000-0000-0000-0000-000000000000');
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a task' })
  async create(@Body() dto: CreateTaskDto) {
    return this.adminTaskService.create({
      ...dto,
      dueBy: dto.dueBy ? new Date(dto.dueBy) : undefined,
    });
  }

  @Patch(':id/assign')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reassign a task' })
  async assign(@Param('id') id: string, @Body() dto: AssignTaskDto) {
    return this.adminTaskService.assign(id, dto.assignedTo);
  }

  @Patch(':id/status')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.adminTaskService.updateStatus(id, dto.status);
  }
}
