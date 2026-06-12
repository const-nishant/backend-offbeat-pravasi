import { Test, type TestingModule } from '@nestjs/testing';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import type { CreateStoryDto } from './dtos/create-story.dto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('StoriesController', () => {
  let controller: StoriesController;
  let storiesService: jest.Mocked<StoriesService>;

  const mockUser = { id: 'user-1', email: 'test@test.com', isAdmin: false };
  const mockStory = {
    id: 'story-1',
    user: { id: 'user-1' },
    mediaUrl: 'https://cdn.example.com/story.mp4',
    mediaType: 'VIDEO',
    caption: 'Quick update',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    viewsCount: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    storiesService = {
      create: jest.fn(),
      findActiveByFriends: jest.fn(),
      delete: jest.fn(),
      markAsViewed: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [StoriesService],
    })
      .overrideProvider(StoriesService)
      .useValue(storiesService)
      .compile();

    controller = module.get<StoriesController>(StoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveStories', () => {
    it('should call service.findActiveByFriends with user id', async () => {
      storiesService.findActiveByFriends.mockResolvedValue([mockStory as any]);

      const result = await controller.getActiveStories(mockUser as any);

      expect(result).toEqual([mockStory]);
      expect(storiesService.findActiveByFriends).toHaveBeenCalledWith('user-1');
    });
  });

  describe('create', () => {
    it('should call service.create with correct params', async () => {
      const dto: CreateStoryDto = {
        mediaUrl: 'https://cdn.example.com/story.mp4',
        mediaType: 'VIDEO',
        caption: 'Quick update',
      };
      storiesService.create.mockResolvedValue(mockStory as any);

      const result = await controller.create(mockUser as any, dto);

      expect(result).toEqual(mockStory);
      expect(storiesService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('delete', () => {
    it('should call service.delete with correct params', async () => {
      storiesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockUser as any, 'story-1');

      expect(result).toEqual({ message: 'Story deleted' });
      expect(storiesService.delete).toHaveBeenCalledWith('user-1', 'story-1');
    });
  });

  describe('markAsViewed', () => {
    it('should call service.markAsViewed with correct params', async () => {
      storiesService.markAsViewed.mockResolvedValue({ viewed: true });

      const result = await controller.markAsViewed(mockUser as any, 'story-1');

      expect(result).toEqual({ viewed: true });
      expect(storiesService.markAsViewed).toHaveBeenCalledWith(
        'story-1',
        'user-1',
      );
    });
  });
});
