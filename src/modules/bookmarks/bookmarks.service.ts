import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bookmark } from './entities/bookmark.entity';
import { Trek } from '../treks/entities/trek.entity';
import {
  TrekInteraction,
  InteractionType,
} from '../treks/entities/trek-interaction.entity';
import { User } from '../users/entities/user.entity';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly bookmarkRepo: Repository<Bookmark>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(TrekInteraction)
    private readonly interactionRepo: Repository<TrekInteraction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async toggle(
    userId: string,
    trekId: string,
  ): Promise<{ bookmarked: boolean }> {
    const trek = await this.trekRepo.findOne({ where: { id: trekId } });
    if (!trek) throw new NotFoundException('Trek not found');

    const existing = await this.bookmarkRepo.findOne({
      where: { user: { id: userId }, trek: { id: trekId } },
    });

    if (existing) {
      await this.bookmarkRepo.remove(existing);
      await this.interactionRepo.delete({
        user: { id: userId } as any,
        trek: { id: trekId } as any,
        type: InteractionType.BOOKMARK,
      });
      return { bookmarked: false };
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const bookmark = this.bookmarkRepo.create({
      user,
      trek,
    });
    await this.bookmarkRepo.save(bookmark);

    const existingInteraction = await this.interactionRepo.findOne({
      where: {
        user: { id: userId } as any,
        trek: { id: trekId } as any,
        type: InteractionType.BOOKMARK,
      },
    });
    if (!existingInteraction) {
      const interaction = this.interactionRepo.create({
        user,
        trek,
        type: InteractionType.BOOKMARK,
      });
      await this.interactionRepo.save(interaction);
    }

    return { bookmarked: true };
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });

    const [items, total] = await this.bookmarkRepo.findAndCount({
      where: { user: { id: userId } },
      relations: ['trek', 'trek.images', 'trek.tags'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const data = items.map((b) => ({
      id: b.id,
      trek: b.trek,
      createdAt: b.createdAt,
    }));

    return { data, meta: buildPaginationMeta(p, l, total) };
  }

  async isBookmarked(userId: string, trekId: string): Promise<boolean> {
    const count = await this.bookmarkRepo.count({
      where: { user: { id: userId }, trek: { id: trekId } },
    });
    return count > 0;
  }
}
