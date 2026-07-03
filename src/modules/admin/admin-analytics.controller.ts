import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import {
  AdminAnalyticsDauQueryDto,
  AdminAnalyticsTrekPopularityQueryDto,
  AdminAnalyticsFunnelQueryDto,
  AdminAnalyticsRevenueQueryDto,
  AdminAnalyticsRetentionQueryDto,
} from './dtos/admin-analytics.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Analytics')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('dau')
  @ApiOperation({ summary: 'Daily active users (7/30/90 day windows)' })
  async getDau(@Query() q: AdminAnalyticsDauQueryDto) {
    return this.adminAnalyticsService.getDau(q.days ?? 7);
  }

  @Get('trek-popularity')
  @ApiOperation({
    summary: 'Treks ranked by views, bookmarks, bookings (rolling 30d)',
  })
  async getTrekPopularity(@Query() q: AdminAnalyticsTrekPopularityQueryDto) {
    return this.adminAnalyticsService.getTrekPopularity(
      q.days ?? 30,
      q.limit ?? 50,
    );
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Page views → add-to-cart → payment → completion' })
  async getConversionFunnel(@Query() q: AdminAnalyticsFunnelQueryDto) {
    return this.adminAnalyticsService.getConversionFunnel(
      q.startDate,
      q.endDate,
      q.trekId,
    );
  }

  @Get('revenue-trends')
  @ApiOperation({ summary: 'Daily/weekly/monthly MRR, ARPU by provider' })
  async getRevenueTrends(@Query() q: AdminAnalyticsRevenueQueryDto) {
    return this.adminAnalyticsService.getRevenueTrends(
      q.period ?? 'daily',
      q.days ?? 90,
    );
  }

  @Get('retention-cohort')
  @ApiOperation({ summary: 'D7/D30/D90 retention by signup month' })
  async getRetentionCohorts(@Query() q: AdminAnalyticsRetentionQueryDto) {
    return this.adminAnalyticsService.getRetentionCohorts(q.months ?? 12);
  }
}
