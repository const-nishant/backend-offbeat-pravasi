import { Test, type TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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
            presignTrekImage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
    mediaService = module.get(MediaService);
  });

  describe('presignTrek', () => {
    it('should call mediaService.presignTrekImage with filename', () => {
      const mockResult = {
        key: 'treks/12345-abc.jpg',
        url: null,
        presignedUrl: null,
      };
      mediaService.presignTrekImage.mockReturnValue(mockResult);

      const result = controller.presignTrek({ filename: 'photo.jpg' });

      expect(result).toEqual(mockResult);
      expect(mediaService.presignTrekImage).toHaveBeenCalledWith('photo.jpg');
    });
  });
});
