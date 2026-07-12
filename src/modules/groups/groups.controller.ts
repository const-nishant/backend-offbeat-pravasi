import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dtos/create-group.dto';
import { InviteMembersDto } from './dtos/invite-members.dto';
import { UpdateGroupDto } from './dtos/update-group.dto';
import { UpdateMemberStatusDto } from './dtos/update-member-status.dto';
import { GroupDetailDto } from './dtos/group-response.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Groups')
@Controller()
@UseGuards(AuthGuard('jwt'))
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('groups')
  @ApiOperation({ summary: 'Create a new trek group' })
  @ApiOkResponse({ type: GroupDetailDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.create(user.id, dto);
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get group details and members' })
  @ApiOkResponse({ type: GroupDetailDto })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.groupsService.getById(id, user.id);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update group name, maxSize, or expiresAt' })
  @ApiOkResponse({ type: GroupDetailDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.id, dto);
  }

  @Post('groups/:id/invite')
  @ApiOperation({ summary: 'Invite members to the group' })
  @ApiOkResponse({ description: 'Members invited' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: InviteMembersDto,
  ) {
    return this.groupsService.invite(id, user.id, dto);
  }

  @Post('groups/join/:shareCode')
  @ApiOperation({ summary: 'Join a group via share code' })
  @ApiOkResponse({ description: 'Joined the group' })
  async join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shareCode') shareCode: string,
  ) {
    return this.groupsService.join(shareCode, user.id, user.email);
  }

  @Patch('groups/:id/members/:memberId/status')
  @ApiOperation({ summary: 'Accept or decline invitation' })
  @ApiOkResponse({ description: 'Status updated' })
  async updateMemberStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    return this.groupsService.updateMemberStatus(id, memberId, user.id, dto);
  }

  @Delete('groups/:id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the group' })
  @ApiOkResponse({ description: 'Member removed' })
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.removeMember(id, memberId, user.id);
  }

  @Post('groups/:id/book')
  @ApiOperation({ summary: 'Book for all joined members' })
  @ApiOkResponse({ description: 'Booking created' })
  async book(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groupsService.bookForGroup(id, user.id);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Cancel a group' })
  @ApiOkResponse({ description: 'Group cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.groupsService.cancel(id, user.id);
  }
}
