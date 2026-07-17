import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FriendshipsService } from './friendships.service';
import { SendFriendRequestDto } from './dtos/send-request.dto';
import { FriendRequestStatus } from './enums/friend-request-status.enum';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Friendships')
@Controller()
@UseGuards(AuthGuard('jwt'))
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Post('friend-requests')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiOkResponse({ description: 'Friend request sent' })
  async sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendshipsService.sendRequest(user.id, dto.receiverId);
  }

  @Get('friend-requests')
  @ApiOperation({ summary: 'List incoming pending friend requests' })
  @ApiOkResponse({ description: 'List of pending requests' })
  async getPendingRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.friendshipsService.getPendingRequests(user.id);
  }

  @Get('friend-requests/sent')
  @ApiOperation({ summary: 'List sent friend requests' })
  @ApiOkResponse({ description: 'List of sent requests' })
  async getSentRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.friendshipsService.getSentRequests(user.id);
  }

  @Post('friend-requests/:id/accept')
  @ApiOperation({ summary: 'Accept a friend request' })
  @ApiOkResponse({ description: 'Friend request accepted' })
  async acceptRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.friendshipsService.respondToRequest(
      id,
      user.id,
      FriendRequestStatus.ACCEPTED,
    );
  }

  @Post('friend-requests/:id/decline')
  @ApiOperation({ summary: 'Decline a friend request' })
  @ApiOkResponse({ description: 'Friend request declined' })
  async declineRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.friendshipsService.respondToRequest(
      id,
      user.id,
      FriendRequestStatus.DECLINED,
    );
  }

  @Get('friends')
  @ApiOperation({ summary: 'List all friends' })
  @ApiOkResponse({ description: 'List of friends' })
  async getFriends(@CurrentUser() user: AuthenticatedUser) {
    return this.friendshipsService.getFriends(user.id);
  }

  @Delete('friends/:id')
  @ApiOperation({ summary: 'Remove a friend' })
  @ApiOkResponse({ description: 'Friend removed' })
  async removeFriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.friendshipsService.removeFriend(user.id, id);
  }
}
