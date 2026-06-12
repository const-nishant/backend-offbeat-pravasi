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

@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @UseGuards(JwtAuthGuard)
  @Post('applications')
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
  async getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.organizerService.getDashboard(user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks')
  async listTreks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerTrekFiltersDto,
  ) {
    return this.organizerService.listTreks(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks/:id')
  async getTrekDetail(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.getTrekDetail(id, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Patch('treks/:id/status')
  async updateTrekStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.updateTrekStatus(id, status, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks/:id/bookings')
  async getTrekBookings(
    @Param('id') id: string,
    @Query() query: OrganizerBookingFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.getTrekBookings(id, user.id, query);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('treks/:id/reviews')
  async getTrekReviews(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizerService.getTrekReviews(id, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('bookings')
  async listBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerBookingFiltersDto,
  ) {
    return this.organizerService.listBookings(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('analytics')
  async getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerAnalyticsFiltersDto,
  ) {
    return this.organizerService.getAnalytics(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('revenue')
  async getRevenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: OrganizerAnalyticsFiltersDto,
  ) {
    return this.organizerService.getRevenue(user.id, filters);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Get('participants')
  async getParticipants(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OrganizerBookingFiltersDto,
  ) {
    return this.organizerService.getParticipants(user.id, query);
  }
}
