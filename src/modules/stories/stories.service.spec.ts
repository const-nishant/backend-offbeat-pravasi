import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoriesService } from './stories.service';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';
import { CreateStoryDto } from './dtos/create-story.dto';
import { User } from '../users/entities/user.entity';
import { FriendshipsService } from '../friendships/friendships.service';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('StoriesService', () => {
  let service: StoriesService;
  let storyRepo: jest.Mocked<Repository<Story>>;
  let viewRepo: jest.Mocked<Repository<StoryView>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let friendshipsService: jest.Mocked<FriendshipsService>;

  const mockUser = { id: 'user-1', email: 'test@test.com' } as User;
  const mockStory = {
    id: 'story-1',
    user: mockUser,
    mediaUrl: 'https://cdn.example.com/story.mp4',
    mediaType: 'VIDEO',
    caption: 'Quick update',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    viewsCount: 0,
    createdAt: new Date(),
  } as Story;

  beforeEach(async () => {
    storyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
    } as any;

    viewRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    userRepo = {
      findOne: jest.fn(),
    } as any;

    friendshipsService = {
      getFriendIds: jest.fn(),
    } as any;

    service = new StoriesService(
      storyRepo as any,
      viewRepo as any,
      userRepo as any,
      friendshipsService as any,
    );
  });

  describe('create', () => {
    const dto: CreateStoryDto = {
      mediaUrl: 'https://cdn.example.com/story.mp4',
      mediaType: 'VIDEO',
      caption: 'Quick update',
    };

    it('should create a story with 24h expiry', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      storyRepo.create.mockReturnValue(mockStory);
      storyRepo.save.mockResolvedValue(mockStory);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(mockStory);
      expect(storyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          mediaUrl: dto.mediaUrl,
          mediaType: dto.mediaType,
          caption: dto.caption,
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.create('bad-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActiveByFriends', () => {
    it('should return active stories from friends and self', async () => {
      friendshipsService.getFriendIds.mockResolvedValue(['friend-1']);
      storyRepo.find.mockResolvedValue([mockStory]);

      const result = await service.findActiveByFriends('user-1');

      expect(result).toEqual([mockStory]);
      expect(friendshipsService.getFriendIds).toHaveBeenCalledWith('user-1');
    });

    it('should return empty array when no stories', async () => {
      friendshipsService.getFriendIds.mockResolvedValue([]);
      storyRepo.find.mockResolvedValue([]);

      const result = await service.findActiveByFriends('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete own story', async () => {
      storyRepo.findOne.mockResolvedValue(mockStory);
      storyRepo.remove.mockResolvedValue(mockStory);

      await service.delete('user-1', 'story-1');

      expect(storyRepo.remove).toHaveBeenCalledWith(mockStory);
    });

    it('should throw ForbiddenException for another user story', async () => {
      storyRepo.findOne.mockResolvedValue({
        ...mockStory,
        user: { id: 'other-user' },
      } as Story);

      await expect(service.delete('user-1', 'story-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if story not found', async () => {
      storyRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsViewed', () => {
    it('should mark as viewed first time', async () => {
      const futureStory = {
        ...mockStory,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
      storyRepo.findOne.mockResolvedValue(futureStory);
      viewRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(mockUser);
      viewRepo.create.mockReturnValue({} as StoryView);
      viewRepo.save.mockResolvedValue({} as StoryView);
      storyRepo.increment.mockResolvedValue({} as any);

      const result = await service.markAsViewed('story-1', 'user-2');

      expect(result).toEqual({ viewed: true });
      expect(storyRepo.increment).toHaveBeenCalledWith(
        { id: 'story-1' },
        'viewsCount',
        1,
      );
    });

    it('should return viewed=false if already viewed', async () => {
      const futureStory = {
        ...mockStory,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
      const existingView = { id: 'view-1' } as StoryView;
      storyRepo.findOne.mockResolvedValue(futureStory);
      viewRepo.findOne.mockResolvedValue(existingView);

      const result = await service.markAsViewed('story-1', 'user-2');

      expect(result).toEqual({ viewed: false });
    });

    it('should throw NotFoundException if story expired', async () => {
      const expiredStory = {
        ...mockStory,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      };
      storyRepo.findOne.mockResolvedValue(expiredStory);

      await expect(
        service.markAsViewed('story-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if story not found', async () => {
      storyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.markAsViewed('bad-id', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
