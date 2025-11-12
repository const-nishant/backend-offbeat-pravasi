import { Controller, Get } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('status')
  getStatus(): { status: string } {
    return this.bookingsService.getStatus();
  }
}
