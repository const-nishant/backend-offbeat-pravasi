import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminBookingOverrideService } from './admin-booking-override.service';
import { AdminBookingOverrideDto } from './dtos/admin-booking-override.dto';
import { AdminForceCancelDto } from './dtos/admin-force-cancel.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Bookings')
@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBookingOverrideController {
  constructor(
    private readonly adminBookingOverrideService: AdminBookingOverrideService,
  ) {}

  @Patch(':id/override')
  @ApiOperation({ summary: 'Override booking details (price, dates, notes)' })
  async overrideBooking(
    @Param('id') id: string,
    @Body() body: AdminBookingOverrideDto,
    @Req() req: any,
  ) {
    return this.adminBookingOverrideService.overrideBooking(
      id,
      body,
      req.user,
      req,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Force-cancel a booking with refund override' })
  async forceCancel(
    @Param('id') id: string,
    @Body() body: AdminForceCancelDto,
    @Req() req: any,
  ) {
    return this.adminBookingOverrideService.forceCancel(
      id,
      body,
      req.user,
      req,
    );
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get chronological event log for a booking' })
  async getTimeline(@Param('id') id: string): Promise<any> {
    return this.adminBookingOverrideService.getTimeline(id);
  }
}
