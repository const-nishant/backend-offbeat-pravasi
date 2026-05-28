import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from 'src/common/decorators/current-user.decorator';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateOrganizerRequestDto } from './dtos/create-organizer-request.dto';
import { UpdateOrganizerRequestDto } from './dtos/update-organizer-request.dto';
import { OrganizerService } from './organizer.service';

@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  // Create a new application (authenticated users)
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

  // Get current user's latest application
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

  // Admin: get application by id
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

  // Admin: update application (review)
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
}
