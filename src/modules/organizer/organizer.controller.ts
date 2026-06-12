import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from 'src/common/decorators/current-user.decorator';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { OrganizerGuard } from 'src/common/guards/organizer.guard';
import { CreateOrganizerRequestDto } from './dtos/create-organizer-request.dto';
import { UpdateOrganizerRequestDto } from './dtos/update-organizer-request.dto';
import { OrganizerTrekFiltersDto } from './dtos/organizer-trek-filters.dto';
import { OrganizerBookingFiltersDto } from './dtos/organizer-booking-filters.dto';
import { OrganizerAnalyticsFiltersDto } from './dtos/organizer-analytics-filters.dto';
import { OrganizerService } from './organizer.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Organizer')
@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @UseGuards(JwtAuthGuard)
  @Post('applications')
  @ApiOperation({ summary: 'Submit organizer application' })
  async createApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizerRequestDto,
  ) {
    const app = await this.organizerService.createApplication(user.id, dto);
    return {
      success: true,
      message: 'Organizer application submitted',
      data: app,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('applications/me')
  @ApiOperation({ summary: 'Get my organizer application status' })
  async myApplication(@CurrentUser() user: AuthenticatedUser) {
    const app = await this.organizerService.getMyApplication(user.id);
    return {
      success: true,
      message: 'User application fetched',
      data: app,
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('applications/:id')
  @ApiOperation({ summary: 'Get organizer application detail (admin)' })
  async getApplication(@Param('id') id: string) {
    const app = await this.organizerService.getApplicationById(id);
    if (!app) {
      throw new NotFoundException('Application not found');
    }
    return {
      success: true,
      message: 'Application fetched',
      data: app,
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('applications/:id')
  @ApiOperation({ summary: 'Update organizer application (admin)' })
  async updateApplication(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizerRequestDto,
  ) {
    const app = await this.organizerService.updateApplication(id, dto);
    return {
      success: true,
      message: 'Application updated',
      data: app,
    };
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('dashboard')
  @ApiOperation({ summary: 'Get organizer dashboard' })
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerService.getDashboard(user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks')
  @ApiOperation({ summary: "List organizer's treks" })
  async listTreks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerTrekFiltersDto,
  ) {
    return this.organizerService.listTreks(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks/:id')
  @ApiOperation({ summary: 'Get organizer trek detail' })
  async getTrekDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.getTrekDetail(id, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Patch('treks/:id/status')
  @ApiOperation({ summary: 'Update trek status' })
  async updateTrekStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.updateTrekStatus(id, status, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks/:id/bookings')
  @ApiOperation({ summary: 'Get bookings for a trek' })
  async getTrekBookings(
    @Param('id') id: string,
    @Query() query: OrganizerBookingFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.getTrekBookings(id, user.id, query);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks/:id/reviews')
  @ApiOperation({ summary: 'Get reviews for a trek' })
  async getTrekReviews(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.getTrekReviews(id, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('bookings')
  @ApiOperation({ summary: 'List organizer bookings across treks' })
  async listBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerBookingFiltersDto,
  ) {
    return this.organizerService.listBookings(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('analytics')
  @ApiOperation({ summary: 'Get organizer analytics' })
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerAnalyticsFiltersDto,
  ) {
    return this.organizerService.getAnalytics(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('revenue')
  @ApiOperation({ summary: 'Get organizer revenue data' })
  async getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerAnalyticsFiltersDto,
  ) {
    return this.organizerService.getRevenue(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('participants')
  @ApiOperation({ summary: 'List organizer participants' })
  async getParticipants(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizerBookingFiltersDto,
  ) {
    return this.organizerService.getParticipants(user.id, query);
  }
}
