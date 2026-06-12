import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { MediaCategory } from './entities/media.entity';

@Injectable()
export class MediaService {
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

  presignUrl(category: MediaCategory, filename: string, mimeType: string) {
    const folder = this.folderForCategory(category);
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const key = `${folder}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const base = process.env.R2_PUBLIC_BASE_URL ?? '';
    const url = base ? `${base.replace(/\/$/, '')}/${key}` : null;

    return {
      key,
      url,
      presignedUrl: null,
    };
  }

  presignProfile(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.PROFILE, filename, mimeType);
  }

  presignBanner(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.BANNER, filename, mimeType);
  }

  presignPost(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.POST, filename, mimeType);
  }

  presignTrek(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.TREK, filename, mimeType);
  }

  presignStory(filename: string, mimeType: string) {
    return this.presignUrl(MediaCategory.STORY, filename, mimeType);
  }

  presignTrekImage(filename: string, _folder = 'treks') {
    return this.presignTrek(filename, 'image/jpeg');
  }
}
