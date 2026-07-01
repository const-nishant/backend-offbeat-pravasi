import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WishlistCollection } from './entities/wishlist-collection.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { CreateCollectionDto } from './dtos/create-collection.dto';
import { UpdateCollectionDto } from './dtos/update-collection.dto';
import { AddToCollectionDto } from './dtos/add-to-collection.dto';
import { UpdateItemDto } from './dtos/update-item.dto';
import {
  WishlistCollectionResponseDto,
  WishlistItemResponseDto,
} from './dtos/wishlist-collection-response.dto';
import { Trek } from '../treks/entities/trek.entity';
import {
  TrekInteraction,
  InteractionType,
} from '../treks/entities/trek-interaction.entity';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectRepository(WishlistCollection)
    private readonly collectionRepo: Repository<WishlistCollection>,
    @InjectRepository(WishlistItem)
    private readonly itemRepo: Repository<WishlistItem>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(TrekInteraction)
    private readonly interactionRepo: Repository<TrekInteraction>,
  ) {}

  async getCollections(
    userId: string,
  ): Promise<WishlistCollectionResponseDto[]> {
    const collections = await this.collectionRepo.find({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return collections.map((c) => this.mapCollection(c));
  }

  async createCollection(
    userId: string,
    dto: CreateCollectionDto,
  ): Promise<WishlistCollectionResponseDto> {
    const existing = await this.collectionRepo.findOne({
      where: { userId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Collection "${dto.name}" already exists`);
    }
    const collection = this.collectionRepo.create({
      userId,
      name: dto.name,
      description: dto.description ?? null,
    });
    const saved = await this.collectionRepo.save(collection);
    return this.mapCollection(saved);
  }

  async updateCollection(
    collectionId: string,
    userId: string,
    dto: UpdateCollectionDto,
  ): Promise<WishlistCollectionResponseDto> {
    const collection = await this.findCollectionOrThrow(collectionId, userId);
    if (dto.name !== undefined) {
      const dup = await this.collectionRepo.findOne({
        where: { userId, name: dto.name },
      });
      if (dup && dup.id !== collectionId) {
        throw new ConflictException(`Collection "${dto.name}" already exists`);
      }
      collection.name = dto.name;
    }
    if (dto.description !== undefined) {
      collection.description = dto.description;
    }
    const saved = await this.collectionRepo.save(collection);
    return this.mapCollection(saved);
  }

  async deleteCollection(collectionId: string, userId: string): Promise<void> {
    const collection = await this.findCollectionOrThrow(collectionId, userId);
    await this.collectionRepo.remove(collection);
  }

  async getItems(
    collectionId: string,
    userId: string,
  ): Promise<WishlistItemResponseDto[]> {
    const collection = await this.findCollectionOrThrow(collectionId, userId);
    const items = await this.itemRepo.find({
      where: { collectionId: collection.id },
      order: { sortOrder: 'ASC', priority: 'DESC', addedAt: 'ASC' },
    });
    return items.map((i) => this.mapItem(i));
  }

  async addItem(
    collectionId: string,
    userId: string,
    dto: AddToCollectionDto,
  ): Promise<WishlistItemResponseDto> {
    const collection = await this.findCollectionOrThrow(collectionId, userId);
    const existing = await this.itemRepo.findOne({
      where: { collectionId: collection.id, trekId: dto.trekId },
    });
    if (existing) {
      throw new ConflictException('Trek already in this collection');
    }
    const trek = await this.trekRepo.findOne({ where: { id: dto.trekId } });
    const item = this.itemRepo.create({
      collectionId: collection.id,
      trekId: dto.trekId,
      notes: dto.notes ?? null,
      priority: dto.priority ?? 0,
      basePriceInr: trek?.costInr ?? null,
    });
    const saved = await this.itemRepo.save(item);
    if (trek) await this.recordInteraction(userId, trek);
    return this.mapItem(saved);
  }

  async updateItem(
    itemId: string,
    userId: string,
    dto: UpdateItemDto,
  ): Promise<WishlistItemResponseDto> {
    const item = await this.findItemOrThrow(itemId, userId);
    if (dto.notes !== undefined) {
      item.notes = dto.notes;
    }
    if (dto.priority !== undefined) {
      item.priority = dto.priority;
    }
    const saved = await this.itemRepo.save(item);
    return this.mapItem(saved);
  }

  async removeItem(itemId: string, userId: string): Promise<void> {
    const item = await this.findItemOrThrow(itemId, userId);
    await this.itemRepo.remove(item);
    await this.removeInteraction(userId, item.trekId);
  }

  async quickAdd(
    trekId: string,
    userId: string,
  ): Promise<WishlistItemResponseDto> {
    let defaultCollection = await this.collectionRepo.findOne({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!defaultCollection) {
      defaultCollection = this.collectionRepo.create({
        userId,
        name: 'Saved Treks',
        description: 'Default collection for saved treks',
      });
      defaultCollection = await this.collectionRepo.save(defaultCollection);
    }
    const existing = await this.itemRepo.findOne({
      where: { collectionId: defaultCollection.id, trekId },
    });
    if (existing) {
      return this.mapItem(existing);
    }
    const trek = await this.trekRepo.findOne({ where: { id: trekId } });
    const item = this.itemRepo.create({
      collectionId: defaultCollection.id,
      trekId,
      basePriceInr: trek?.costInr ?? null,
    });
    const saved = await this.itemRepo.save(item);
    if (trek) await this.recordInteraction(userId, trek);
    return this.mapItem(saved);
  }

  async generateShareToken(
    collectionId: string,
    userId: string,
  ): Promise<string> {
    const collection = await this.findCollectionOrThrow(collectionId, userId);
    if (!collection.shareToken) {
      collection.shareToken = uuidv4().replace(/-/g, '').slice(0, 16);
      await this.collectionRepo.save(collection);
    }
    return collection.shareToken;
  }

  async getSharedCollection(
    token: string,
  ): Promise<WishlistCollectionResponseDto> {
    const collection = await this.collectionRepo.findOne({
      where: { shareToken: token },
    });
    if (!collection) {
      throw new NotFoundException('Shared collection not found');
    }
    const items = await this.itemRepo.find({
      where: { collectionId: collection.id },
      order: { sortOrder: 'ASC', priority: 'DESC', addedAt: 'ASC' },
    });
    return {
      ...this.mapCollection(collection),
      items: items.map((i) => this.mapItem(i)),
    };
  }

  async getTrekIdsInWishlist(userId: string): Promise<Set<string>> {
    const collections = await this.collectionRepo.find({
      where: { userId },
      select: ['id'],
    });
    if (collections.length === 0) return new Set();
    const items = await this.itemRepo.find({
      where: collections.map((c) => ({ collectionId: c.id })),
      select: ['trekId'],
    });
    return new Set(items.map((i) => i.trekId));
  }

  async toggleSave(
    trekId: string,
    userId: string,
  ): Promise<{ saved: boolean }> {
    const trek = await this.trekRepo.findOne({ where: { id: trekId } });
    if (!trek) throw new NotFoundException('Trek not found');

    const collections = await this.collectionRepo.find({
      where: { userId },
      select: ['id'],
    });
    if (collections.length > 0) {
      const existing = await this.itemRepo.findOne({
        where: collections.map((c) => ({ collectionId: c.id, trekId })),
      });
      if (existing) {
        await this.itemRepo.remove(existing);
        await this.removeInteraction(userId, trekId);
        return { saved: false };
      }
    }

    let defaultCollection = await this.collectionRepo.findOne({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!defaultCollection) {
      defaultCollection = this.collectionRepo.create({
        userId,
        name: 'Saved Treks',
        description: 'Default collection for saved treks',
      });
      defaultCollection = await this.collectionRepo.save(defaultCollection);
    }
    const item = this.itemRepo.create({
      collectionId: defaultCollection.id,
      trekId,
      basePriceInr: trek.costInr,
    });
    await this.itemRepo.save(item);
    await this.recordInteraction(userId, trek);
    return { saved: true };
  }

  async getTrekStatus(
    trekId: string,
    userId: string,
  ): Promise<{ saved: boolean; collectionIds: string[] }> {
    const collections = await this.collectionRepo.find({
      where: { userId },
      select: ['id'],
    });
    if (collections.length === 0) return { saved: false, collectionIds: [] };
    const items = await this.itemRepo.find({
      where: collections.map((c) => ({ collectionId: c.id, trekId })),
      select: ['collectionId'],
    });
    const collectionIds = items.map((i) => i.collectionId);
    return { saved: collectionIds.length > 0, collectionIds };
  }

  async getAllItems(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: WishlistItemResponseDto[]; meta: any }> {
    const collections = await this.collectionRepo.find({
      where: { userId },
      select: ['id'],
    });
    if (collections.length === 0) {
      return { data: [], meta: buildPaginationMeta(page, limit, 0) };
    }
    const { skip, take, page: p, limit: l } = getPagination({ page, limit });
    const [items, total] = await this.itemRepo.findAndCount({
      where: collections.map((c) => ({ collectionId: c.id })),
      order: { addedAt: 'DESC' },
      skip,
      take,
    });
    return {
      data: items.map((i) => this.mapItem(i)),
      meta: buildPaginationMeta(p, l, total),
    };
  }

  private async recordInteraction(userId: string, trek: Trek): Promise<void> {
    try {
      const existing = await this.interactionRepo.findOne({
        where: {
          user: { id: userId } as any,
          trek: { id: trek.id } as any,
          type: InteractionType.BOOKMARK,
        },
      });
      if (!existing) {
        const interaction = this.interactionRepo.create({
          user: { id: userId } as any,
          trek,
          type: InteractionType.BOOKMARK,
        });
        await this.interactionRepo.save(interaction);
      }
    } catch (err) {
      this.logger.warn('Failed to record bookmark interaction', err);
    }
  }

  private async removeInteraction(
    userId: string,
    trekId: string,
  ): Promise<void> {
    try {
      await this.interactionRepo.delete({
        user: { id: userId } as any,
        trek: { id: trekId } as any,
        type: InteractionType.BOOKMARK,
      });
    } catch (err) {
      this.logger.warn('Failed to remove bookmark interaction', err);
    }
  }

  private async findCollectionOrThrow(
    id: string,
    userId: string,
  ): Promise<WishlistCollection> {
    const collection = await this.collectionRepo.findOne({ where: { id } });
    if (!collection) throw new NotFoundException('Collection not found');
    if (collection.userId !== userId)
      throw new BadRequestException('Not your collection');
    return collection;
  }

  private async findItemOrThrow(
    id: string,
    userId: string,
  ): Promise<WishlistItem> {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['collection'],
    });
    if (!item) throw new NotFoundException('Wishlist item not found');
    if (item.collection.userId !== userId)
      throw new BadRequestException('Not your wishlist item');
    return item;
  }

  private mapCollection(c: WishlistCollection): WishlistCollectionResponseDto {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      shareToken: c.shareToken,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private mapItem(i: WishlistItem): WishlistItemResponseDto {
    return {
      id: i.id,
      trekId: i.trekId,
      notes: i.notes,
      priority: i.priority,
      sortOrder: i.sortOrder,
      addedAt: i.addedAt,
      basePriceInr: i.basePriceInr,
    };
  }
}
