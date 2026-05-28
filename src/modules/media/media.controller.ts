import { Body, Controller, Post } from '@nestjs/common';
import { MediaService } from './media.service';

class PresignDto {
  filename!: string;
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign/trek')
  presignTrek(@Body() dto: PresignDto) {
    return this.mediaService.presignTrekImage(dto.filename);
  }
}
