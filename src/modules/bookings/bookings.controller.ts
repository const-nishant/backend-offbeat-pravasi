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
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a booking' })
  async createBooking(@Body() body: CreateBookingDto, @Req() req: any) {
    return this.bookingsService.createBooking(body, req.user);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List my bookings' })
  async listMyBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationDto,
  ) {
    return this.bookingsService.findByUser(user.id, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get booking detail' })
  async getBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.findOne(id, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.bookingsService.cancelBooking(id, user.id, reason);
  }

  @Get(':id/ticket')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Download booking ticket PDF' })
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
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Verify a booking QR token' })
  async verifyBooking(@Body('qrToken') qrToken: string) {
    return this.bookingsService.verifyQrToken(qrToken);
  }

  @Patch('release-expired')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Release expired booking holds (admin)' })
  async releaseExpired() {
    return this.bookingsService.releaseExpiredHolds();
  }
}
