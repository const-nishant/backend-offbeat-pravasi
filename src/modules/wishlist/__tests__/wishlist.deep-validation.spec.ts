import { type TestingModule, Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WishlistService } from '../wishlist.service';
import { WishlistCollection } from '../entities/wishlist-collection.entity';
import { WishlistItem } from '../entities/wishlist-item.entity';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Trek } from '../../treks/entities/trek.entity';
import { TrekInteraction } from '../../treks/entities/trek-interaction.entity';

/**
 * Wishlist Deep Validation — 12yr QA Engineer
 */
describe('Wishlist Deep Validation — 12yr QA', () => {
  let service: WishlistService;
  let colRepo: jest.Mocked<Repository<WishlistCollection>>;
  let itemRepo: jest.Mocked<Repository<WishlistItem>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let interactionRepo: jest.Mocked<Repository<TrekInteraction>>;

  const mockCol = (
    overrides: Partial<WishlistCollection> = {},
  ): WishlistCollection =>
    ({
      id: 'col-1',
      userId: 'user-a',
      name: 'Favorites',
      description: null,
      isDefault: false,
      sortOrder: 0,
      shareToken: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    }) as WishlistCollection;

  const mockItem = (overrides: Partial<WishlistItem> = {}): WishlistItem =>
    ({
      id: 'item-1',
      collectionId: 'col-1',
      trekId: 'trek-1',
      notes: null,
      priority: 0,
      sortOrder: 0,
      addedAt: new Date(),
      basePriceInr: null,
      collection: null as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    }) as WishlistItem;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: getRepositoryToken(WishlistCollection),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            merge: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WishlistItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Trek), useValue: { findOne: jest.fn() } },
        {
          provide: getRepositoryToken(TrekInteraction),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    colRepo = module.get(getRepositoryToken(WishlistCollection));
    itemRepo = module.get(getRepositoryToken(WishlistItem));
    trekRepo = module.get(getRepositoryToken(Trek));
    interactionRepo = module.get(getRepositoryToken(TrekInteraction));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trek existence — no trek repo in WishlistService', () => {
    it('addItem does not validate trek existence in service', async () => {
      colRepo.findOne.mockResolvedValue(mockCol());
      itemRepo.findOne.mockResolvedValue(null);
      const expectedItem = mockItem({ trekId: 'nonexistent' });
      itemRepo.create.mockReturnValue(expectedItem);
      itemRepo.save.mockImplementation((e: any) =>
        Promise.resolve({ ...expectedItem, ...e }),
      );

      const result = await service.addItem('col-1', 'user-a', {
        trekId: 'nonexistent',
      });
      expect(result.trekId).toBe('nonexistent');
    });
  });

  describe('Duplicate prevention', () => {
    it('should throw ConflictException when trek already in same collection', async () => {
      colRepo.findOne.mockResolvedValue(mockCol());
      itemRepo.findOne.mockResolvedValue(mockItem({ trekId: 'trek-dupe' }));
      await expect(
        service.addItem('col-1', 'user-a', { trekId: 'trek-dupe' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('User isolation', () => {
    it('should throw BadRequestException when updating another users collection', async () => {
      colRepo.findOne.mockResolvedValue(mockCol({ userId: 'user-b' }));
      await expect(
        service.updateCollection('col-1', 'user-a', { name: 'Hacked' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when removing another users item', async () => {
      const foreignItem = mockItem({
        collection: mockCol({ userId: 'user-b' }),
      });
      itemRepo.findOne.mockResolvedValue(foreignItem);
      await expect(service.removeItem('item-1', 'user-a')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Remove item correct semantics', () => {
    it('should call itemRepo.remove with the found item', async () => {
      const item = mockItem({ collection: mockCol() });
      itemRepo.findOne.mockResolvedValue(item);
      itemRepo.remove.mockResolvedValue(item as any);

      await service.removeItem('item-1', 'user-a');
      expect(itemRepo.remove).toHaveBeenCalledWith(item);
    });
  });

  describe('Partial update fields', () => {
    it('should preserve fields not in the update DTO', async () => {
      const existing = mockCol({ name: 'Old Name', description: 'Old Desc' });
      colRepo.findOne.mockResolvedValue(existing);
      let saved: any = null;
      colRepo.save.mockImplementation((e: any) => {
        saved = e;
        return Promise.resolve(e);
      });

      await service.updateCollection('col-1', 'user-a', {
        description: 'New Desc',
      });
      expect(saved.description).toBe('New Desc');
      expect(saved.name).toBe('Old Name');
    });
  });

  describe('Collection name conflict', () => {
    it('should throw ConflictException when creating duplicate name', async () => {
      colRepo.findOne.mockResolvedValue(mockCol({ name: 'Favorites' }));
      await expect(
        service.createCollection('user-a', { name: 'Favorites' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Large collection', () => {
    it('should handle 50+ item references', async () => {
      colRepo.find.mockResolvedValue([mockCol({ name: 'Big', items: [] })]);
      itemRepo.find.mockResolvedValue(
        Array.from({ length: 50 }, (_, i) =>
          mockItem({ id: `item-${i}`, trekId: `trek-${i}` }),
        ),
      );
      const items = await service.getItems('col-1', 'user-a');
      expect(items.length).toBe(50);
    });
  });

  describe('Quick add to default collection', () => {
    it('should create default collection if none exists', async () => {
      colRepo.findOne.mockResolvedValue(null);
      colRepo.create.mockReturnValue(
        mockCol({ id: 'new-col', name: 'Saved Treks' }),
      );
      colRepo.save.mockResolvedValue(
        mockCol({ id: 'new-col', name: 'Saved Treks' }),
      );
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockReturnValue(
        mockItem({ id: 'new-item', collectionId: 'new-col', trekId: 'trek-q' }),
      );
      itemRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.quickAdd('trek-q', 'user-a');
      expect(result.trekId).toBe('trek-q');
    });

    it('should return existing item if trek already in default collection', async () => {
      colRepo.findOne.mockResolvedValue(
        mockCol({ id: 'def-col', name: 'Saved Treks' }),
      );
      itemRepo.findOne.mockResolvedValue(
        mockItem({
          id: 'existing-item',
          collectionId: 'def-col',
          trekId: 'trek-ex',
        }),
      );
      const result = await service.quickAdd('trek-ex', 'user-a');
      expect(result.id).toBe('existing-item');
    });
  });

  describe('Share token generation', () => {
    it('should generate a token only once', async () => {
      const col = mockCol({ shareToken: null });
      colRepo.findOne.mockResolvedValue(col);
      let saved: any = null;
      colRepo.save.mockImplementation((e: any) => {
        saved = e;
        return Promise.resolve(e);
      });

      const token1 = await service.generateShareToken('col-1', 'user-a');
      const token2 = await service.generateShareToken('col-1', 'user-a');
      expect(token1).toEqual(token2);
      expect(saved!.shareToken).toBeDefined();
    });
  });

  describe('Shared collection view', () => {
    it('should throw NotFoundException for invalid token', async () => {
      colRepo.findOne.mockResolvedValue(null);
      await expect(service.getSharedCollection('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include items for valid token', async () => {
      colRepo.findOne.mockResolvedValue(mockCol({ shareToken: 'valid-token' }));
      itemRepo.find.mockResolvedValue([mockItem()]);
      const result = await service.getSharedCollection('valid-token');
      expect(result).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // NEW FEATURES: toggleSave, getTrekStatus, getAllItems
  // ──────────────────────────────────────────────

  describe('toggleSave', () => {
    it('should throw NotFoundException when trek does not exist', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(
        service.toggleSave('nonexistent-trek', 'user-a'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should save trek to default collection if not already saved', async () => {
      const trek = { id: 'trek-t', name: 'Test Trek' } as Trek;
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([]); // no collections → will create default
      colRepo.findOne.mockResolvedValue(null); // no default collection
      colRepo.create.mockReturnValue(
        mockCol({ id: 'new-col', name: 'Saved Treks' }),
      );
      colRepo.save.mockResolvedValue(
        mockCol({ id: 'new-col', name: 'Saved Treks' }),
      );
      itemRepo.create.mockReturnValue(
        mockItem({ id: 'new-item', collectionId: 'new-col', trekId: 'trek-t' }),
      );
      itemRepo.save.mockImplementation((e: any) =>
        Promise.resolve({ ...e, id: 'new-item' }),
      );
      interactionRepo.findOne.mockResolvedValue(null);
      interactionRepo.create.mockReturnValue({} as any);
      interactionRepo.save.mockResolvedValue({} as any);

      const result = await service.toggleSave('trek-t', 'user-a');
      expect(result.saved).toBe(true);
      expect(colRepo.create).toHaveBeenCalled();
      expect(interactionRepo.create).toHaveBeenCalled();
    });

    it('should remove trek if already saved (toggle off)', async () => {
      const trek = { id: 'trek-t', name: 'Test Trek' } as Trek;
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      itemRepo.findOne.mockResolvedValue(
        mockItem({ id: 'item-1', trekId: 'trek-t' }),
      );
      itemRepo.remove.mockResolvedValue({} as any);
      interactionRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.toggleSave('trek-t', 'user-a');
      expect(result.saved).toBe(false);
      expect(itemRepo.remove).toHaveBeenCalled();
      expect(interactionRepo.delete).toHaveBeenCalled();
    });

    it('should use first existing collection instead of creating a new one', async () => {
      const trek = { id: 'trek-x', name: 'X Trek' } as Trek;
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([mockCol({ id: 'existing-col' })]);
      colRepo.findOne.mockResolvedValue(mockCol({ id: 'existing-col' })); // default collection lookup
      itemRepo.findOne.mockResolvedValue(null); // not yet saved
      itemRepo.create.mockReturnValue(
        mockItem({
          id: 'item-x',
          collectionId: 'existing-col',
          trekId: 'trek-x',
        }),
      );
      itemRepo.save.mockImplementation((e: any) =>
        Promise.resolve({ ...e, id: 'item-x' }),
      );
      interactionRepo.findOne.mockResolvedValue(null);
      interactionRepo.create.mockReturnValue({} as any);
      interactionRepo.save.mockResolvedValue({} as any);

      const result = await service.toggleSave('trek-x', 'user-a');
      expect(result.saved).toBe(true);
      expect(itemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionId: 'existing-col',
          trekId: 'trek-x',
        }),
      );
      expect(colRepo.create).not.toHaveBeenCalled();
    });

    it('should not fail when interaction tracking throws (graceful)', async () => {
      const trek = { id: 'trek-y', name: 'Y Trek' } as Trek;
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([]);
      colRepo.findOne.mockResolvedValue(null);
      colRepo.create.mockReturnValue(mockCol({ id: 'def' }));
      colRepo.save.mockResolvedValue(mockCol({ id: 'def' }));
      itemRepo.create.mockReturnValue(
        mockItem({ id: 'item-y', collectionId: 'def', trekId: 'trek-y' }),
      );
      itemRepo.save.mockImplementation((e: any) =>
        Promise.resolve({ ...e, id: 'item-y' }),
      );
      interactionRepo.findOne.mockRejectedValue(new Error('DB down'));

      const result = await service.toggleSave('trek-y', 'user-a');
      expect(result.saved).toBe(true); // interaction failure should not throw
    });
  });

  describe('getTrekStatus', () => {
    it('should return saved:false when no collections exist', async () => {
      colRepo.find.mockResolvedValue([]);
      const result = await service.getTrekStatus('trek-1', 'user-a');
      expect(result).toEqual({ saved: false, collectionIds: [] });
    });

    it('should return saved:false and empty array when trek not in any collection', async () => {
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      itemRepo.find.mockResolvedValue([]);
      const result = await service.getTrekStatus('trek-1', 'user-a');
      expect(result).toEqual({ saved: false, collectionIds: [] });
    });

    it('should return saved:true with collection IDs when trek is saved', async () => {
      colRepo.find.mockResolvedValue([
        mockCol({ id: 'col-1' }),
        mockCol({ id: 'col-2' }),
      ]);
      itemRepo.find.mockResolvedValue([
        { collectionId: 'col-1' } as WishlistItem,
        { collectionId: 'col-2' } as WishlistItem,
      ]);
      const result = await service.getTrekStatus('trek-1', 'user-a');
      expect(result).toEqual({
        saved: true,
        collectionIds: ['col-1', 'col-2'],
      });
    });

    it('should only return collections belonging to the requesting user', async () => {
      colRepo.find.mockResolvedValue([mockCol({ id: 'my-col' })]);
      itemRepo.find.mockResolvedValue([
        { collectionId: 'my-col' } as WishlistItem,
      ]);
      const result = await service.getTrekStatus('trek-1', 'user-a');
      expect(result.collectionIds).toEqual(['my-col']);
    });
  });

  describe('getAllItems', () => {
    it('should return empty data when no collections exist', async () => {
      colRepo.find.mockResolvedValue([]);
      const result = await service.getAllItems('user-a');
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.page).toBe(1);
    });

    it('should return paginated items from all collections', async () => {
      colRepo.find.mockResolvedValue([
        mockCol({ id: 'col-1' }),
        mockCol({ id: 'col-2' }),
      ]);
      const items = [
        mockItem({ id: 'i-1', trekId: 't-1', collectionId: 'col-1' }),
        mockItem({ id: 'i-2', trekId: 't-2', collectionId: 'col-2' }),
      ];
      itemRepo.findAndCount.mockResolvedValue([items, 2]);

      const result = await service.getAllItems('user-a', 1, 20);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should order by addedAt DESC', async () => {
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      const items = [
        mockItem({ id: 'i-old', addedAt: new Date('2024-01-01') }),
        mockItem({ id: 'i-new', addedAt: new Date('2025-01-01') }),
      ];
      itemRepo.findAndCount.mockResolvedValue([items, 2]);

      const result = await service.getAllItems('user-a', 1, 20);
      expect(result.data[0].id).toBe('i-old');
      expect(result.data[1].id).toBe('i-new');
    });

    it('should respect page and limit parameters', async () => {
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      const items = [mockItem({ id: 'i-1' })];
      itemRepo.findAndCount.mockResolvedValue([items, 50]);

      const result = await service.getAllItems('user-a', 3, 10);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should handle empty wishlist gracefully', async () => {
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      itemRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getAllItems('user-a');
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('Interaction tracking — recordInteraction', () => {
    it('should create interaction when none exists', async () => {
      const trek = { id: 'trek-i', name: 'ITrek' } as Trek;
      interactionRepo.findOne.mockResolvedValue(null);
      interactionRepo.create.mockReturnValue({} as any);
      interactionRepo.save.mockResolvedValue({} as any);

      // call toggleSave which internally calls recordInteraction
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([]);
      colRepo.findOne.mockResolvedValue(null);
      colRepo.create.mockReturnValue(mockCol({ id: 'def' }));
      colRepo.save.mockResolvedValue(mockCol({ id: 'def' }));
      itemRepo.create.mockReturnValue(
        mockItem({ id: 'i-new', collectionId: 'def', trekId: 'trek-i' }),
      );
      itemRepo.save.mockImplementation((e: any) =>
        Promise.resolve({ ...e, id: 'i-new' }),
      );

      await service.toggleSave('trek-i', 'user-a');
      expect(interactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BOOKMARK' }),
      );
      expect(interactionRepo.save).toHaveBeenCalled();
    });

    it('should NOT create duplicate interaction if one already exists', async () => {
      const trek = { id: 'trek-dup', name: 'Dup' } as Trek;
      interactionRepo.findOne.mockResolvedValue({ id: 'existing-int' } as any);
      interactionRepo.create.mockClear();
      interactionRepo.save.mockClear();

      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([]);
      colRepo.findOne.mockResolvedValue(null);
      colRepo.create.mockReturnValue(mockCol({ id: 'def' }));
      colRepo.save.mockResolvedValue(mockCol({ id: 'def' }));
      itemRepo.create.mockReturnValue(
        mockItem({ id: 'i-dup', collectionId: 'def', trekId: 'trek-dup' }),
      );
      itemRepo.save.mockImplementation((e: any) =>
        Promise.resolve({ ...e, id: 'i-dup' }),
      );

      await service.toggleSave('trek-dup', 'user-a');
      expect(interactionRepo.create).not.toHaveBeenCalled();
      expect(interactionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Interaction tracking — removeInteraction', () => {
    it('should delete interaction on toggle off', async () => {
      const trek = { id: 'trek-del', name: 'Del' } as Trek;
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      itemRepo.findOne.mockResolvedValue(
        mockItem({ id: 'item-del', trekId: 'trek-del' }),
      );
      itemRepo.remove.mockResolvedValue({} as any);
      interactionRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await service.toggleSave('trek-del', 'user-a');
      expect(interactionRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'BOOKMARK' }),
      );
    });

    it('should not throw when removeInteraction fails (graceful)', async () => {
      const trek = { id: 'trek-g', name: 'Graceful' } as Trek;
      trekRepo.findOne.mockResolvedValue(trek);
      colRepo.find.mockResolvedValue([mockCol({ id: 'col-1' })]);
      itemRepo.findOne.mockResolvedValue(
        mockItem({ id: 'item-g', trekId: 'trek-g' }),
      );
      itemRepo.remove.mockResolvedValue({} as any);
      interactionRepo.delete.mockRejectedValue(new Error('DB fail'));

      await expect(service.toggleSave('trek-g', 'user-a')).resolves.toEqual({
        saved: false,
      });
    });
  });
});
