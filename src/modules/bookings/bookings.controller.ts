import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Patch,
  Get,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/decorators/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createBooking(@Body() body: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.createBooking(body, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listMyBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ) {
    return this.bookingsService.findByUser(user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.findOne(id, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.bookingsService.cancelBooking(id, user.id, reason);
  }

  @Get(':id/ticket')
  @UseGuards(JwtAuthGuard)
  async downloadTicket(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.bookingsService.getTicketPdf(id, user.id);
    return new StreamableFile(result.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="booking-${id}-ticket.pdf"`,
    });
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyBooking(@Body('qrToken') qrToken: string) {
    return this.bookingsService.verifyQrToken(qrToken);
  }

  @Patch('release-expired')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async releaseExpired() {
    return this.bookingsService.releaseExpiredHolds();
  }
}
