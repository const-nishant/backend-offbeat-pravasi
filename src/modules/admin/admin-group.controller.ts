import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminGroupService } from './admin-group.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsIn, IsUUID } from 'class-validator';

class UpdateStatusDto {
  @IsIn(['active', 'banned', 'flagged'])
  status!: string;
}

class TransferOwnershipDto {
  @IsUUID()
  newOwnerUserId!: string;
}

@ApiTags('Admin / Groups')
@Controller('admin/groups')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminGroupController {
  constructor(private readonly adminGroupService: AdminGroupService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List groups with moderation info' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminGroupService.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch(':id/status')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Ban, warn, or clear a group' })
  async updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStatusDto) {
    return this.adminGroupService.updateStatus(id, dto.status);
  }

  @Get(':id/members')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List group members' })
  async listMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminGroupService.listMembers(id);
  }

  @Delete(':id/members/:memberId')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove a member from the group' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.adminGroupService.removeMember(id, memberId);
  }

  @Post(':id/transfer-ownership')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Transfer group ownership' })
  async transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.adminGroupService.transferOwnership(id, dto.newOwnerUserId);
  }
}
