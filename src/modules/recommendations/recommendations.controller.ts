import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RecommendationsService } from './recommendations.service';
import { RecommendationPreferenceDto } from './dtos/recommendation-preference.dto';
import {
  RecommendationResultDto,
  SimilarTrekDto,
} from './dtos/recommendation-response.dto';
import { TrekDifficulty } from '../treks/enums/trek-difficulty.enum';
@ApiTags('Recommendations')
@Controller()
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized trek recommendations' })
  @ApiOkResponse({ type: [RecommendationResultDto] })
  async getRecommendations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ): Promise<RecommendationResultDto[]> {
    const results = await this.recommendationsService.getForUser(
      user.id,
      limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10,
    );
    return results.map((r) => ({
      trekId: r.trekId,
      score: r.score,
      reason: r.reason,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommendations/refresh')
  @ApiOperation({ summary: 'Force refresh recommendations' })
  @ApiOkResponse({ type: [RecommendationResultDto] })
  async refreshRecommendations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecommendationResultDto[]> {
    const results = await this.recommendationsService.refresh(user.id, 10);
    return results.map((r) => ({
      trekId: r.trekId,
      score: r.score,
      reason: r.reason,
    }));
  }

  @Get('treks/:trekId/recommendations')
  @ApiOperation({ summary: 'Get similar treks for a specific trek' })
  @ApiOkResponse({ type: [SimilarTrekDto] })
  async getSimilarTreks(
    @Param('trekId') trekId: string,
    @Query('limit') limit?: string,
  ): Promise<SimilarTrekDto[]> {
    return this.recommendationsService.getForTrek(
      trekId,
      limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('recommendations/preferences')
  @ApiOperation({ summary: 'Set recommendation preferences' })
  async setPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecommendationPreferenceDto,
  ): Promise<void> {
    return this.recommendationsService.updatePreferences(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommendations/preferences')
  @ApiOperation({ summary: 'Get recommendation preferences' })
  async getPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecommendationPreferenceDto | null> {
    const pref = await this.recommendationsService.getPreferences(user.id);
    if (!pref) return null;
    return {
      preferredDifficulty: (pref.preferredDifficulty ?? undefined) as
        | TrekDifficulty[]
        | undefined,
      preferredStates: pref.preferredStates ?? undefined,
      maxBudget: pref.maxBudget ?? undefined,
      preferredDurationDays: pref.preferredDurationDays ?? undefined,
      interests: pref.interests ?? undefined,
    } as RecommendationPreferenceDto;
  }
}
