import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { PostsService } from './posts.service';
import type { Post } from './entities/post.entity';
import type { Comment } from './entities/comment.entity';
import type { PostLike } from './entities/post-like.entity';
import type { CreatePostDto } from './dtos/create-post.dto';
import type { CommentPostDto } from './dtos/comment-post.dto';
import type { User } from '../users/entities/user.entity';
import type { FriendshipsService } from '../friendships/friendships.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PostsService', () => {
  let service: PostsService;
  let postRepo: jest.Mocked<Repository<Post>>;
  let commentRepo: jest.Mocked<Repository<Comment>>;
  let likeRepo: jest.Mocked<Repository<PostLike>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let friendshipsService: jest.Mocked<FriendshipsService>;

  const mockUser = { id: 'user-1', email: 'test@test.com' } as User;
  const mockPost = {
    id: 'post-1',
    user: mockUser,
    caption: 'Great trek!',
    imageUrls: ['https://cdn.example.com/img1.jpg'],
    location: 'Himachal',
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Post;

  beforeEach(async () => {
    postRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    commentRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    likeRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;

    userRepo = {
      findOne: jest.fn(),
    } as any;

    friendshipsService = {
      getFriendIds: jest.fn(),
    } as any;

    service = new PostsService(
      postRepo as any,
      commentRepo as any,
      likeRepo as any,
      userRepo as any,
      friendshipsService as any,
    );
  });

  describe('create', () => {
    const dto: CreatePostDto = {
      caption: 'Great trek!',
      imageUrls: ['https://cdn.example.com/img1.jpg'],
      location: 'Himachal',
    };

    it('should create a post for valid user', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      postRepo.create.mockReturnValue(mockPost);
      postRepo.save.mockResolvedValue(mockPost);

      const result = await service.create('user-1', dto);

      expect(result).toEqual(mockPost);
      expect(postRepo.create).toHaveBeenCalledWith({
        user: mockUser,
        caption: dto.caption,
        imageUrls: dto.imageUrls,
        location: dto.location,
      });
      expect(postRepo.save).toHaveBeenCalledWith(mockPost);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.create('bad-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFeed', () => {
    it('should return paginated posts from friends and self', async () => {
      friendshipsService.getFriendIds.mockResolvedValue(['friend-1']);
      postRepo.findAndCount.mockResolvedValue([[mockPost], 1]);

      const result = await service.getFeed('user-1', 1, 20);

      expect(result.data).toEqual([mockPost]);
      expect(result.meta.total).toBe(1);
      expect(friendshipsService.getFriendIds).toHaveBeenCalledWith('user-1');
    });

    it('should return only own posts when no friends', async () => {
      friendshipsService.getFriendIds.mockResolvedValue([]);
      postRepo.findAndCount.mockResolvedValue([[mockPost], 1]);

      const result = await service.getFeed('user-1', 1, 20);

      expect(result.data).toEqual([mockPost]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('toggleLike', () => {
    it('should create a like when not already liked', async () => {
      postRepo.findOne.mockResolvedValue(mockPost);
      likeRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(mockUser);
      likeRepo.create.mockReturnValue({} as PostLike);
      likeRepo.save.mockResolvedValue({} as PostLike);
      postRepo.increment.mockResolvedValue({} as any);

      const result = await service.toggleLike('user-1', 'post-1');

      expect(result).toEqual({ liked: true });
      expect(likeRepo.create).toHaveBeenCalledWith({
        post: mockPost,
        user: mockUser,
      });
      expect(postRepo.increment).toHaveBeenCalledWith(
        { id: 'post-1' },
        'likesCount',
        1,
      );
    });

    it('should remove like when already liked', async () => {
      const existingLike = { id: 'like-1' } as PostLike;
      postRepo.findOne.mockResolvedValue(mockPost);
      likeRepo.findOne.mockResolvedValue(existingLike);
      likeRepo.remove.mockResolvedValue(existingLike);
      postRepo.decrement.mockResolvedValue({} as any);

      const result = await service.toggleLike('user-1', 'post-1');

      expect(result).toEqual({ liked: false });
      expect(likeRepo.remove).toHaveBeenCalledWith(existingLike);
      expect(postRepo.decrement).toHaveBeenCalledWith(
        { id: 'post-1' },
        'likesCount',
        1,
      );
    });

    it('should throw NotFoundException if post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleLike('user-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addComment', () => {
    const dto: CommentPostDto = { comment: 'Amazing view!' };

    it('should add comment and increment count', async () => {
      const mockComment = {
        id: 'comment-1',
        post: mockPost,
        user: mockUser,
        comment: 'Amazing view!',
        createdAt: new Date(),
      } as Comment;

      postRepo.findOne.mockResolvedValue(mockPost);
      userRepo.findOne.mockResolvedValue(mockUser);
      commentRepo.create.mockReturnValue(mockComment);
      commentRepo.save.mockResolvedValue(mockComment);
      postRepo.increment.mockResolvedValue({} as any);

      const result = await service.addComment('user-1', 'post-1', dto);

      expect(result).toEqual(mockComment);
      expect(commentRepo.create).toHaveBeenCalledWith({
        post: mockPost,
        user: mockUser,
        comment: 'Amazing view!',
      });
      expect(postRepo.increment).toHaveBeenCalledWith(
        { id: 'post-1' },
        'commentsCount',
        1,
      );
    });

    it('should throw NotFoundException if post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.addComment('user-1', 'bad-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getComments', () => {
    it('should return paginated comments for a post', async () => {
      const mockComment = {
        id: 'comment-1',
        post: mockPost,
        user: mockUser,
        comment: 'Nice!',
        createdAt: new Date(),
      } as Comment;

      postRepo.findOne.mockResolvedValue(mockPost);
      commentRepo.findAndCount.mockResolvedValue([[mockComment], 1]);

      const result = await service.getComments('post-1', 1, 10);

      expect(result.data).toEqual([mockComment]);
      expect(result.meta.total).toBe(1);
    });

    it('should throw NotFoundException if post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.getComments('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete own post', async () => {
      postRepo.findOne.mockResolvedValue(mockPost);
      postRepo.softDelete.mockResolvedValue({} as any);

      await service.delete('user-1', 'post-1');

      expect(postRepo.softDelete).toHaveBeenCalledWith('post-1');
    });

    it('should throw ForbiddenException for another user post', async () => {
      postRepo.findOne.mockResolvedValue({
        ...mockPost,
        user: { id: 'other-user' },
      } as Post);

      await expect(service.delete('user-1', 'post-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if post does not exist', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('user-1', 'bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
