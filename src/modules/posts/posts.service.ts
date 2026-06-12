import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { PostLike } from './entities/post-like.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dtos/create-post.dto';
import { CommentPostDto } from './dtos/comment-post.dto';
import { FriendshipsService } from '../friendships/friendships.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly friendshipsService: FriendshipsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<Post> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const post = this.postRepo.create({
      user,
      caption: dto.caption,
      imageUrls: dto.imageUrls,
      location: dto.location ?? undefined,
    });

    return this.postRepo.save(post);
  }

  async getFeed(userId: string, page = 1, limit = 20) {
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });

    const friendIds = await this.friendshipsService.getFriendIds(userId);

    const visibleIds = [...new Set([userId, ...friendIds])];

    const [items, total] = await this.postRepo.findAndCount({
      where: { user: { id: In(visibleIds) } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data: items, meta: buildPaginationMeta(p, l, total) };
  }

  async toggleLike(
    userId: string,
    postId: string,
  ): Promise<{ liked: boolean }> {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user'],
    });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.likeRepo.findOne({
      where: { post: { id: postId }, user: { id: userId } },
    });

    if (existing) {
      await this.likeRepo.remove(existing);
      await this.postRepo.decrement({ id: postId }, 'likesCount', 1);
      return { liked: false };
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const like = this.likeRepo.create({ post, user });
    await this.likeRepo.save(like);
    await this.postRepo.increment({ id: postId }, 'likesCount', 1);

    if (post.user.id !== userId) {
      const likerName = user.fullName ?? user.username ?? 'Someone';
      this.notificationsService
        .notifyPostLiked(post.user.id, postId, likerName)
        .catch((e) => this.logger.error('Like push failed', e));
    }

    return { liked: true };
  }

  async addComment(
    userId: string,
    postId: string,
    dto: CommentPostDto,
  ): Promise<Comment> {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user'],
    });
    if (!post) throw new NotFoundException('Post not found');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const comment = this.commentRepo.create({
      post,
      user,
      comment: dto.comment,
    });
    const saved = await this.commentRepo.save(comment);

    await this.postRepo.increment({ id: postId }, 'commentsCount', 1);

    if (post.user.id !== userId) {
      const commenterName = user.fullName ?? user.username ?? 'Someone';
      this.notificationsService
        .notifyPostCommented(post.user.id, postId, commenterName, dto.comment)
        .catch((e) => this.logger.error('Comment push failed', e));
    }

    return saved;
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });

    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const [items, total] = await this.commentRepo.findAndCount({
      where: { post: { id: postId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return { data: items, meta: buildPaginationMeta(p, l, total) };
  }

  async delete(userId: string, postId: string): Promise<void> {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user'],
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepo.softDelete(postId);
  }
}
