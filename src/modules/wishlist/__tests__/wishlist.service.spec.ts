import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistService } from '../wishlist.service';
import { WishlistCollection } from '../entities/wishlist-collection.entity';
import { WishlistItem } from '../entities/wishlist-item.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { TrekInteraction } from '../../treks/entities/trek-interaction.entity';

describe('WishlistService', () => {
  let service: WishlistService;
  let collectionRepo: jest.Mocked<Repository<WishlistCollection>>;
  let itemRepo: jest.Mocked<Repository<WishlistItem>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let interactionRepo: jest.Mocked<Repository<TrekInteraction>>;

  const mockCollection = {
    id: 'col-1',
    userId: 'user-1',
    name: 'Bucket List',
    description: 'My dream treks',
    sortOrder: 0,
    shareToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as WishlistCollection;

  const mockItem = {
    id: 'item-1',
    collectionId: 'col-1',
    trekId: 'trek-1',
    notes: null,
    priority: 0,
    sortOrder: 0,
    addedAt: new Date(),
    basePriceInr: null,
    collection: mockCollection,
  } as WishlistItem;

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
        {
          provide: getRepositoryToken(Trek),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(TrekInteraction),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    collectionRepo = module.get(getRepositoryToken(WishlistCollection));
    itemRepo = module.get(getRepositoryToken(WishlistItem));
    trekRepo = module.get(getRepositoryToken(Trek));
    interactionRepo = module.get(getRepositoryToken(TrekInteraction));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCollections', () => {
    it('should return all collections for user ordered by sortOrder', async () => {
      collectionRepo.find.mockResolvedValue([mockCollection]);
      const result = await service.getCollections('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bucket List');
      expect(collectionRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
    });

    it('should return empty array when no collections', async () => {
      collectionRepo.find.mockResolvedValue([]);
      const result = await service.getCollections('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('createCollection', () => {
    it('should create and return a new collection', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      collectionRepo.create.mockReturnValue(mockCollection);
      collectionRepo.save.mockResolvedValue(mockCollection);

      const result = await service.createCollection('user-1', { name: 'Bucket List', description: 'My dream treks' });
      expect(result.name).toBe('Bucket List');
      expect(collectionRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Bucket List',
        description: 'My dream treks',
      });
    });

    it('should throw ConflictException when name already exists', async () => {
      collectionRepo.findOne.mockResolvedValue(mockCollection);
      await expect(service.createCollection('user-1', { name: 'Bucket List' })).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCollection', () => {
    it('should update collection name', async () => {
      collectionRepo.findOne.mockResolvedValueOnce(mockCollection).mockResolvedValueOnce(null);
      const updated = { ...mockCollection, name: 'Updated' };
      collectionRepo.save.mockResolvedValue(updated);

      const result = await service.updateCollection('col-1', 'user-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException for non-existent collection', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await expect(service.updateCollection('bad-id', 'user-1', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for wrong user', async () => {
      collectionRepo.findOne.mockResolvedValue(mockCollection);
      await expect(service.updateCollection('col-1', 'other-user', { name: 'x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCollection', () => {
    it('should remove collection', async () => {
      collectionRepo.findOne.mockResolvedValue(mockCollection);
      await service.deleteCollection('col-1', 'user-1');
      expect(collectionRepo.remove).toHaveBeenCalledWith(mockCollection);
    });
  });

  describe('getItems', () => {
    it('should return items for collection', async () => {
      collectionRepo.findOne.mockResolvedValue(mockCollection);
      itemRepo.find.mockResolvedValue([mockItem]);

      const result = await service.getItems('col-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].trekId).toBe('trek-1');
    });
  });

  describe('addItem', () => {
    it('should add trek to collection', async () => {
      collectionRepo.findOne.mockResolvedValue(mockCollection);
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      const result = await service.addItem('col-1', 'user-1', { trekId: 'trek-1' });
      expect(result.trekId).toBe('trek-1');
    });

    it('should throw ConflictException when trek already in collection', async () => {
      collectionRepo.findOne.mockResolvedValue(mockCollection);
      itemRepo.findOne.mockResolvedValue(mockItem);
      await expect(service.addItem('col-1', 'user-1', { trekId: 'trek-1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('updateItem', () => {
    it('should update item notes and priority', async () => {
      itemRepo.findOne.mockResolvedValue(mockItem);
      const updated = { ...mockItem, notes: 'Exciting!', priority: 1 };
      itemRepo.save.mockResolvedValue(updated);

      const result = await service.updateItem('item-1', 'user-1', { notes: 'Exciting!', priority: 1 });
      expect(result.notes).toBe('Exciting!');
      expect(result.priority).toBe(1);
    });
  });

  describe('removeItem', () => {
    it('should remove item', async () => {
      itemRepo.findOne.mockResolvedValue(mockItem);
      await service.removeItem('item-1', 'user-1');
      expect(itemRepo.remove).toHaveBeenCalledWith(mockItem);
    });
  });

  describe('quickAdd', () => {
    it('should add to existing default collection', async () => {
      collectionRepo.findOne.mockResolvedValueOnce(mockCollection);
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      const result = await service.quickAdd('trek-1', 'user-1');
      expect(result.trekId).toBe('trek-1');
    });

    it('should create default collection if none exists', async () => {
      collectionRepo.findOne.mockResolvedValueOnce(null);
      collectionRepo.create.mockReturnValue(mockCollection);
      collectionRepo.save.mockResolvedValue(mockCollection);
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockReturnValue(mockItem);
      itemRepo.save.mockResolvedValue(mockItem);

      const result = await service.quickAdd('trek-1', 'user-1');
      expect(result.trekId).toBe('trek-1');
      expect(collectionRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'Saved Treks',
        description: 'Default collection for saved treks',
      });
    });

    it('should return existing item if already in default collection', async () => {
      collectionRepo.findOne.mockResolvedValueOnce(mockCollection);
      itemRepo.findOne.mockResolvedValue(mockItem);

      const result = await service.quickAdd('trek-1', 'user-1');
      expect(result.id).toBe('item-1');
      expect(itemRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('generateShareToken', () => {
    it('should generate and return share token', async () => {
      const freshCol = { ...mockCollection, shareToken: null };
      collectionRepo.findOne.mockResolvedValue(freshCol);
      collectionRepo.save.mockImplementation(async (col: any) => col);

      const result = await service.generateShareToken('col-1', 'user-1');
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[a-f0-9]+$/);
      expect(collectionRepo.save).toHaveBeenCalled();
    });

    it('should return existing token without regenerating', async () => {
      const withToken = { ...mockCollection, shareToken: 'existing-token' };
      collectionRepo.findOne.mockResolvedValue(withToken);

      const result = await service.generateShareToken('col-1', 'user-1');
      expect(result).toBe('existing-token');
      expect(collectionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getSharedCollection', () => {
    it('should return collection with items by token', async () => {
      const sharedCol = { ...mockCollection, name: 'Shared List', userId: 'user-2' };
      collectionRepo.findOne.mockResolvedValue(sharedCol);
      itemRepo.find.mockResolvedValue([{ ...mockItem, collectionId: sharedCol.id } as WishlistItem]);

      const result = await service.getSharedCollection('token');
      expect(result.name).toBe('Shared List');
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException for bad token', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await expect(service.getSharedCollection('bad-token')).rejects.toThrow(NotFoundException);
    });
  });
});
