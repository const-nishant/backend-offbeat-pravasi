import { Controller, Get } from '@nestjs/common';
import { TreksService } from './treks.service';

@Controller('treks')
export class TreksController {
  constructor(private readonly treksService: TreksService) {}

  @Get('status')
  getStatus(): { status: string } {
    return this.treksService.getStatus();
  }
}
