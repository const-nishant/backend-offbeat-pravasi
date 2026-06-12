import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { MediaCategory } from './entities/media.entity';
import { generatePresignedPutUrl, bucketForCategory } from './r2.client';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  private folderForCategory(category: MediaCategory): string {
    const map: Record<MediaCategory, string> = {
      [MediaCategory.PROFILE]: 'profiles',
      [MediaCategory.BANNER]: 'banners',
      [MediaCategory.POST]: 'posts',
      [MediaCategory.TREK]: 'treks',
      [MediaCategory.STORY]: 'stories',
    };
    return map[category] ?? 'general';
  }

  async presignUrl(category: MediaCategory, filename: string, mimeType: string) {
    const folder = this.folderForCategory(category);
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const key = `${folder}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const base = process.env.R2_PUBLIC_BASE_URL ?? '';
    const url = base ? `${base.replace(/\/$/, '')}/${key}` : null;

    let presignedUrl: string | null = null;
    try {
      presignedUrl = await generatePresignedPutUrl(key, category, mimeType);
    } catch (err) {
      this.logger.error(
        `Failed to generate presigned URL for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      key,
      url,
      presignedUrl,
    };
  }

  async presignProfile(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.PROFILE, filename, mimeType);
  }

  async presignBanner(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.BANNER, filename, mimeType);
  }

  async presignPost(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.POST, filename, mimeType);
  }

  async presignTrek(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.TREK, filename, mimeType);
  }

  async presignStory(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.STORY, filename, mimeType);
  }

  async presignTrekImage(filename: string, _folder = 'treks') {
    return this.presignTrek(filename, 'image/jpeg');
  }
}
