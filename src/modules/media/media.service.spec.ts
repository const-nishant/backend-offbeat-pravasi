import { Test, type TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MediaService],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('presignTrekImage', () => {
    it('should generate a key with the correct folder and extension', () => {
      const result = service.presignTrekImage('photo.jpg', 'treks');

      expect(result.key).toMatch(/^treks\/\d+-[a-f0-9]+\.jpg$/);
      expect(result.url).toBeNull(); // because no R2_PUBLIC_BASE_URL set
      expect(result.presignedUrl).toBeNull();
    });

    it('should include R2 base URL when env var is set', () => {
      process.env.R2_PUBLIC_BASE_URL = 'https://media.example.com';
      // re-create to pick up env
      const svc = new MediaService();
      const result = svc.presignTrekImage('photo.jpg', 'treks');

      expect(result.url).toMatch(
        /^https:\/\/media\.example\.com\/treks\/.+\.jpg$/,
      );
      delete process.env.R2_PUBLIC_BASE_URL;
    });

    it('should handle files without extensions', () => {
      const result = service.presignTrekImage('photo', 'profile');

      expect(result.key).toMatch(/^profile\/\d+-[a-f0-9]+\.bin$/);
    });

    it('should use default folder "treks" when not specified', () => {
      const result = service.presignTrekImage('image.png');

      expect(result.key).toMatch(/^treks\/\d+-[a-f0-9]+\.png$/);
    });
  });
});
