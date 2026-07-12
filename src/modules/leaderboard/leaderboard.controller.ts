import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Leaderboard')
@Controller('leaderboard')
@UseGuards(AuthGuard('jwt'))
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('friends')
  @ApiOperation({ summary: 'Get friend leaderboard' })
  @ApiOkResponse({ description: 'Friend leaderboard ranked by points' })
  async getFriendLeaderboard(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getFriendLeaderboard(user.id);
  }

  @Get('global')
  @ApiOperation({ summary: 'Get global leaderboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Global leaderboard ranked by points' })
  async getGlobalLeaderboard(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getGlobalLeaderboard(
      Number(page) || 1,
      Number(limit) || 50,
    );
  }

  @Get('rank')
  @ApiOperation({ summary: 'Get current user rank' })
  @ApiOkResponse({ description: 'Current user rank and points' })
  async getUserRank(@CurrentUser() user: AuthenticatedUser) {
    return this.leaderboardService.getUserRank(user.id);
  }
}
