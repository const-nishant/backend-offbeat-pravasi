import { Controller } from '@nestjs/common';
import { TreksService } from './treks.service';

@Controller('treks')
export class TreksController {
  constructor(private readonly treksService: TreksService) {}
}
