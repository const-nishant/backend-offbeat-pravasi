import { Controller, Post, Body, UseGuards, Req, Patch } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createBooking(@Body() body: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.createBooking(body, req.user);
  }

  @Patch('release-expired')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async releaseExpired() {
    return this.bookingsService.releaseExpiredHolds();
  }
}
