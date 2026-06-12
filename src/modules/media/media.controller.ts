import { Body, Controller, Post } from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

class PresignDto {
  filename!: string;
}

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign/trek')
  @ApiOperation({ summary: 'Get presigned upload URL for a trek image' })
  presignTrek(@Body() dto: PresignDto) {
    return this.mediaService.presignTrekImage(dto.filename);
  }
}
