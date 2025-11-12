import { Controller, Get } from '@nestjs/common';
import { OrganizerService } from './organizer.service';

@Controller('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Get('status')
  getStatus(): { status: string } {
    return this.organizerService.getStatus();
  }
}
