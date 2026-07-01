import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferralService } from './referrals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import {
  ReferralCodeResponseDto,
  ReferralResponseDto,
  ReferralLeaderboardEntryDto,
  ClaimReferralInfoDto,
} from './dtos/referral-code-response.dto';

@ApiTags('Referrals')
@Controller()
export class ReferralController {
  private readonly shareBaseUrl: string;

  constructor(
    private readonly referralService: ReferralService,
    configService: ConfigService,
  ) {
    this.shareBaseUrl = configService.get<string>(
      'referral.shareBaseUrl',
      'https://offbeatpravasi.com/r',
    );
  }

  @Get('referrals/my-code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get own referral code + stats' })
  @ApiOkResponse({ type: ReferralCodeResponseDto })
  async getMyCode(@CurrentUser() user: AuthenticatedUser) {
    const code = await this.referralService.getOrGenerateCode(user.id);
    return {
      code: code.code,
      shareLink: `${this.shareBaseUrl}/${code.code}`,
      tier: code.tier,
      totalReferrals: code.totalReferrals,
      successfulReferrals: code.successfulReferrals,
      totalEarnedInr: code.totalEarnedInr,
    };
  }

  @Post('referrals/generate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate or fetch existing referral code' })
  @ApiOkResponse({ type: ReferralCodeResponseDto })
  async generate(@CurrentUser() user: AuthenticatedUser) {
    const code = await this.referralService.getOrGenerateCode(user.id);
    return {
      code: code.code,
      shareLink: `${this.shareBaseUrl}/${code.code}`,
      tier: code.tier,
      totalReferrals: code.totalReferrals,
      successfulReferrals: code.successfulReferrals,
      totalEarnedInr: code.totalEarnedInr,
    };
  }

  @Get('referrals/my-referrals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all referrals made (paginated)' })
  @ApiOkResponse({ type: [ReferralResponseDto] })
  async getMyReferrals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.referralService.getMyReferrals(user.id, page, limit);
  }

  @Get('referrals/leaderboard')
  @ApiOperation({ summary: 'Top referrers' })
  @ApiOkResponse({ type: [ReferralLeaderboardEntryDto] })
  async leaderboard(@Query('limit') limit?: number) {
    return this.referralService.getLeaderboard(limit);
  }

  @Get('referrals/claim/:code')
  @ApiOperation({ summary: 'Get referral info for landing page' })
  @ApiOkResponse({ type: ClaimReferralInfoDto })
  async claimInfo(@Param('code') code: string) {
    return this.referralService.getCodeInfo(code);
  }
}
