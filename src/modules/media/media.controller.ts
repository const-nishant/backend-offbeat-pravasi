import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { PresignDto } from './dtos/presign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presign')
  @ApiOperation({ summary: 'Get presigned upload URL for any media category' })
  presign(@Body() dto: PresignDto) {
    return this.mediaService.presignUrl(dto.category, dto.filename, dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('presign/profile')
  @ApiOperation({ summary: 'Get presigned URL for profile image' })
  presignProfile(@Body() dto: PresignDto) {
    return this.mediaService.presignProfile(dto.filename, dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('presign/banner')
  @ApiOperation({ summary: 'Get presigned URL for banner image' })
  presignBanner(@Body() dto: PresignDto) {
    return this.mediaService.presignBanner(dto.filename, dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('presign/post')
  @ApiOperation({ summary: 'Get presigned URL for post image' })
  presignPost(@Body() dto: PresignDto) {
    return this.mediaService.presignPost(dto.filename, dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('presign/trek')
  @ApiOperation({ summary: 'Get presigned URL for trek image' })
  presignTrek(@Body() dto: PresignDto) {
    return this.mediaService.presignTrek(dto.filename, dto.mimeType);
  }

  @UseGuards(JwtAuthGuard)
  @Post('presign/story')
  @ApiOperation({ summary: 'Get presigned URL for story media' })
  presignStory(@Body() dto: PresignDto) {
    return this.mediaService.presignStory(dto.filename, dto.mimeType);
  }
}
