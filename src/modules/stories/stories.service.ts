import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, In, Repository } from 'typeorm';
import { Story } from './entities/story.entity';
import { StoryView } from './entities/story-view.entity';
import { User } from '../users/entities/user.entity';
import { CreateStoryDto } from './dtos/create-story.dto';
import { FriendshipsService } from '../friendships/friendships.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    @InjectRepository(Story)
    private readonly storyRepo: Repository<Story>,
    @InjectRepository(StoryView)
    private readonly viewRepo: Repository<StoryView>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly friendshipsService: FriendshipsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateStoryDto): Promise<Story> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = this.storyRepo.create({
      user,
      mediaUrl: dto.mediaUrl,
      mediaType: dto.mediaType,
      caption: dto.caption ?? undefined,
      expiresAt,
    });

    const saved = await this.storyRepo.save(story);

    const friendIds = await this.friendshipsService.getFriendIds(userId);
    if (friendIds.length > 0) {
      const creatorName = user.fullName ?? user.username ?? 'Someone';
      this.notificationsService
        .notifyStoryPosted(friendIds, creatorName, saved.id)
        .catch((e) => this.logger.error('Story post push failed', e));
    }

    return saved;
  }

  async findActiveByFriends(userId: string) {
    const friendIds = await this.friendshipsService.getFriendIds(userId);

    const visibleIds = [...new Set([userId, ...friendIds])];

    const stories = await this.storyRepo.find({
      where: {
        user: { id: In(visibleIds) },
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return stories;
  }

  async delete(userId: string, storyId: string): Promise<void> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId },
      relations: ['user'],
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own stories');
    }

    await this.storyRepo.remove(story);
  }

  async markAsViewed(
    storyId: string,
    userId: string,
  ): Promise<{ viewed: boolean }> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId },
      relations: ['user'],
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.expiresAt < new Date()) {
      throw new NotFoundException('Story has expired');
    }

    const existing = await this.viewRepo.findOne({
      where: { story: { id: storyId }, user: { id: userId } },
    });

    if (existing) {
      return { viewed: false };
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const view = this.viewRepo.create({ story, user });
    await this.viewRepo.save(view);

    await this.storyRepo.increment({ id: storyId }, 'viewsCount', 1);

    if (story.user.id !== userId) {
      const viewerName = user.fullName ?? user.username ?? 'Someone';
      this.notificationsService
        .notifyStoryViewed(story.user.id, viewerName, storyId)
        .catch((e) => this.logger.error('Story view push failed', e));
    }

    return { viewed: true };
  }
}
