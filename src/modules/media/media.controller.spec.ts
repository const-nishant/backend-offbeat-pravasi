import { Test, type TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MediaCategory } from './entities/media.entity';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: jest.Mocked<MediaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        {
          provide: MediaService,
          useValue: {
            presignUrl: jest.fn(),
            presignProfile: jest.fn(),
            presignBanner: jest.fn(),
            presignPost: jest.fn(),
            presignTrek: jest.fn(),
            presignStory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    mediaService = module.get(MediaService);
  });

  describe('presignTrek', () => {
    it('should call mediaService.presignTrek with dto fields', () => {
      const mockResult = {
        key: 'treks/12345-abc.jpg',
        url: null,
        presignedUrl: null,
      };
      mediaService.presignTrek.mockReturnValue(mockResult);

      const dto = {
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        category: MediaCategory.TREK,
      };
      const result = controller.presignTrek(dto);

      expect(result).toEqual(mockResult);
      expect(mediaService.presignTrek).toHaveBeenCalledWith(
        'photo.jpg',
        'image/jpeg',
      );
    });
  });
});
