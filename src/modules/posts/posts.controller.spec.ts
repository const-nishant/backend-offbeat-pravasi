import { Test, type TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { CommentPostDto } from './dtos/comment-post.dto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: jest.Mocked<PostsService>;

  const mockUser = { id: 'user-1', email: 'test@test.com', isAdmin: false };
  const mockPost = {
    id: 'post-1',
    user: { id: 'user-1' },
    caption: 'Great trek!',
    imageUrls: ['https://cdn.example.com/img1.jpg'],
    location: 'Himachal',
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    postsService = {
      create: jest.fn(),
      getFeed: jest.fn(),
      toggleLike: jest.fn(),
      addComment: jest.fn(),
      getComments: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [PostsService],
    })
      .overrideProvider(PostsService)
      .useValue(postsService)
      .compile();

    controller = module.get<PostsController>(PostsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeed', () => {
    it('should call service.getFeed with correct params', async () => {
      postsService.getFeed.mockResolvedValue({
        data: [mockPost],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });

      const result = await controller.getFeed(mockUser as any, 1, 20);

      expect(result).toEqual({
        data: [mockPost],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      expect(postsService.getFeed).toHaveBeenCalledWith('user-1', 1, 20);
    });
  });

  describe('create', () => {
    it('should call service.create with correct params', async () => {
      const dto: CreatePostDto = {
        caption: 'Great trek!',
        imageUrls: ['https://cdn.example.com/img.jpg'],
      };
      postsService.create.mockResolvedValue(mockPost as any);

      const result = await controller.create(mockUser as any, dto);

      expect(result).toEqual(mockPost);
      expect(postsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('toggleLike', () => {
    it('should call service.toggleLike with correct params', async () => {
      postsService.toggleLike.mockResolvedValue({ liked: true });

      const result = await controller.toggleLike(mockUser as any, 'post-1');

      expect(result).toEqual({ liked: true });
      expect(postsService.toggleLike).toHaveBeenCalledWith('user-1', 'post-1');
    });
  });

  describe('addComment', () => {
    it('should call service.addComment with correct params', async () => {
      const dto: CommentPostDto = { comment: 'Nice view!' };
      postsService.addComment.mockResolvedValue({
        id: 'comment-1',
        comment: 'Nice view!',
      } as any);

      const result = await controller.addComment(
        mockUser as any,
        'post-1',
        dto,
      );

      expect(result).toEqual({ id: 'comment-1', comment: 'Nice view!' });
      expect(postsService.addComment).toHaveBeenCalledWith(
        'user-1',
        'post-1',
        dto,
      );
    });
  });

  describe('getComments', () => {
    it('should call service.getComments with correct params', async () => {
      postsService.getComments.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      const result = await controller.getComments('post-1', 1, 20);

      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      expect(postsService.getComments).toHaveBeenCalledWith('post-1', 1, 20);
    });
  });

  describe('delete', () => {
    it('should call service.delete with correct params', async () => {
      postsService.delete.mockResolvedValue(undefined);

      const result = await controller.delete(mockUser as any, 'post-1');

      expect(result).toEqual({ message: 'Post deleted' });
      expect(postsService.delete).toHaveBeenCalledWith('user-1', 'post-1');
    });
  });
});
