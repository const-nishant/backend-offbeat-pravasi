import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dtos/create-report.dto';
import { ReviewReportDto } from './dtos/review-report.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Reports')
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reports')
  @ApiOperation({ summary: 'Report inappropriate content' })
  @ApiOkResponse({ description: 'Report created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/moderation/pending')
  @ApiOperation({ summary: 'List pending reports (admin)' })
  @ApiOkResponse({ description: 'Pending reports' })
  async getPending(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.findPending(
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/moderation/reports/:id')
  @ApiOperation({ summary: 'Review a report (admin)' })
  @ApiOkResponse({ description: 'Report reviewed' })
  async review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewReportDto,
  ) {
    return this.reportsService.review(id, user.id, dto.status, dto.adminNotes);
  }
}
