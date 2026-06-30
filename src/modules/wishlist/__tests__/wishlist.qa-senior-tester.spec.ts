import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistService } from '../wishlist.service';
import { WishlistCollection } from '../entities/wishlist-collection.entity';
import { WishlistItem } from '../entities/wishlist-item.entity';
import { Trek } from '../../treks/entities/trek.entity';
import { TrekInteraction } from '../../treks/entities/trek-interaction.entity';

describe('WishlistService QA Senior Review', () => {
  let service: WishlistService;
  let collectionRepo: jest.Mocked<Repository<WishlistCollection>>;
  let itemRepo: jest.Mocked<Repository<WishlistItem>>;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let interactionRepo: jest.Mocked<Repository<TrekInteraction>>;

  const baseCollection = () => ({
    id: 'col-1',
    userId: 'user-1',
    name: 'Test Collection',
    description: null,
    sortOrder: 0,
    shareToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as WishlistCollection;

  const baseItem = (overrides = {}) => ({
    id: 'item-1',
    collectionId: 'col-1',
    trekId: 'trek-1',
    notes: null,
    priority: 0,
    sortOrder: 0,
    addedAt: new Date(),
    basePriceInr: null,
    collection: baseCollection(),
    ...overrides,
  }) as unknown as WishlistItem;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: getRepositoryToken(WishlistCollection), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() } },
        { provide: getRepositoryToken(WishlistItem), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), findAndCount: jest.fn() } },
        { provide: getRepositoryToken(Trek), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(TrekInteraction), useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    collectionRepo = module.get(getRepositoryToken(WishlistCollection));
    itemRepo = module.get(getRepositoryToken(WishlistItem));
    trekRepo = module.get(getRepositoryToken(Trek));
    interactionRepo = module.get(getRepositoryToken(TrekInteraction));
  });

  beforeEach(() => { jest.clearAllMocks(); });

  // 1. Boundary analysis — collection name length
  describe('Boundary: collection name length', () => {
    it('should accept 1-char name', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      collectionRepo.create.mockReturnValue(baseCollection());
      collectionRepo.save.mockResolvedValue(baseCollection());
      await expect(service.createCollection('user-1', { name: 'X' })).resolves.toBeDefined();
    });

    it('should accept 120-char name', async () => {
      const longName = 'X'.repeat(120);
      collectionRepo.findOne.mockResolvedValue(null);
      const col = { ...baseCollection(), name: longName };
      collectionRepo.create.mockReturnValue(col);
      collectionRepo.save.mockResolvedValue(col);
      await expect(service.createCollection('user-1', { name: longName })).resolves.toBeDefined();
    });
  });

  // 2. Security — access control
  describe('Security: access control', () => {
    it('should reject update from non-owner', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      await expect(service.updateCollection('col-1', 'other-user', { name: 'x' })).rejects.toThrow(BadRequestException);
    });

    it('should reject delete from non-owner', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      await expect(service.deleteCollection('col-1', 'other-user')).rejects.toThrow(BadRequestException);
    });

    it('should reject item view from non-owner', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      await expect(service.getItems('col-1', 'other-user')).rejects.toThrow(BadRequestException);
    });

    it('should reject item add from non-owner', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      await expect(service.addItem('col-1', 'other-user', { trekId: 'trek-1' })).rejects.toThrow(BadRequestException);
    });

    it('should reject item update from non-owner', async () => {
      const item = baseItem();
      itemRepo.findOne.mockResolvedValue(item);
      await expect(service.updateItem('item-1', 'other-user', { notes: 'x' })).rejects.toThrow(BadRequestException);
    });
  });

  // 3. Security — non-existent resource handling
  describe('Security: non-existent resources', () => {
    it('should throw NotFoundException for missing collection', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await expect(service.getItems('bad-id', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing item', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(service.updateItem('bad-id', 'user-1', { notes: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing shared token', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await expect(service.getSharedCollection('bad-token')).rejects.toThrow(NotFoundException);
    });
  });

  // 4. Duplicate prevention
  describe('Duplicate prevention', () => {
    it('should reject duplicate collection name per user', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      await expect(service.createCollection('user-1', { name: 'Test Collection' })).rejects.toThrow(ConflictException);
    });

    it('should allow same name for different users', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      const user2Col = { ...baseCollection(), userId: 'user-2' };
      collectionRepo.create.mockReturnValue(user2Col);
      collectionRepo.save.mockResolvedValue(user2Col);
      await expect(service.createCollection('user-2', { name: 'Test Collection' })).resolves.toBeDefined();
    });

    it('should reject duplicate trek in same collection', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      itemRepo.findOne.mockResolvedValue(baseItem());
      await expect(service.addItem('col-1', 'user-1', { trekId: 'trek-1' })).rejects.toThrow(ConflictException);
    });
  });

  // 5. Concurrency — simultaneous operations
  describe('Concurrency', () => {
    it('should handle simultaneous collection creation for same user', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      collectionRepo.create.mockReturnValue(baseCollection());
      collectionRepo.save.mockResolvedValue(baseCollection());
      const [r1, r2] = await Promise.all([
        service.createCollection('user-1', { name: 'Concurrent' }),
        service.createCollection('user-1', { name: 'Concurrent 2' }),
      ]);
      expect(r1).toBeDefined();
      expect(r2).toBeDefined();
    });

    it('should handle simultaneous quick-add of same trek', async () => {
      collectionRepo.findOne
        .mockResolvedValueOnce(baseCollection())
        .mockResolvedValueOnce(baseCollection());
      itemRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseItem());
      itemRepo.create.mockReturnValue(baseItem());
      itemRepo.save.mockResolvedValue(baseItem());

      const [r1, r2] = await Promise.all([
        service.quickAdd('trek-1', 'user-1'),
        service.quickAdd('trek-1', 'user-1'),
      ]);
      expect(r1.trekId).toBe('trek-1');
      expect(r2.trekId).toBe('trek-1');
    });
  });

  // 6. Idempotency
  describe('Idempotency', () => {
    it('should be idempotent on repeated quick-add', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      itemRepo.findOne.mockResolvedValue(baseItem());
      const r1 = await service.quickAdd('trek-1', 'user-1');
      const r2 = await service.quickAdd('trek-1', 'user-1');
      expect(r1.id).toBe(r2.id);
      expect(itemRepo.create).not.toHaveBeenCalled();
    });

    it('should return same share token on repeated call', async () => {
      const withToken = { ...baseCollection(), shareToken: 'fixed-token' };
      collectionRepo.findOne.mockResolvedValue(withToken);
      const t1 = await service.generateShareToken('col-1', 'user-1');
      const t2 = await service.generateShareToken('col-1', 'user-1');
      expect(t1).toBe('fixed-token');
      expect(t2).toBe('fixed-token');
    });
  });

  // 7. Empty/null scenarios
  describe('Empty/null scenarios', () => {
    it('should return empty items for empty collection', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      itemRepo.find.mockResolvedValue([]);
      const result = await service.getItems('col-1', 'user-1');
      expect(result).toEqual([]);
    });

    it('should create default collection on quick-add if none exist', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      const newCol = { ...baseCollection(), name: 'Saved Treks' };
      collectionRepo.create.mockReturnValue(newCol);
      collectionRepo.save.mockResolvedValue(newCol);
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockReturnValue(baseItem());
      itemRepo.save.mockResolvedValue(baseItem());

      const result = await service.quickAdd('trek-1', 'user-1');
      expect(result).toBeDefined();
      expect(collectionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Saved Treks' }));
    });
  });

  // 8. Priority validation
  describe('Priority range validation', () => {
    it('should default priority to 0', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      itemRepo.findOne.mockResolvedValue(null);
      itemRepo.create.mockReturnValue(baseItem());
      itemRepo.save.mockResolvedValue(baseItem());
      const result = await service.addItem('col-1', 'user-1', { trekId: 'trek-1' });
      expect(result.priority).toBe(0);
    });

    it('should accept priority 2 (top)', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      itemRepo.findOne.mockResolvedValue(null);
      const highItem = baseItem({ priority: 2 });
      itemRepo.create.mockReturnValue(highItem);
      itemRepo.save.mockResolvedValue(highItem);
      const result = await service.addItem('col-1', 'user-1', { trekId: 'trek-1', priority: 2 });
      expect(result.priority).toBe(2);
    });
  });

  // 9. Data integrity — returned fields match saved fields
  describe('Data integrity', () => {
    it('should return correct fields from createCollection', async () => {
      const saved = { ...baseCollection(), name: 'Integrity Test', description: 'desc' };
      collectionRepo.findOne.mockResolvedValue(null);
      collectionRepo.create.mockReturnValue(saved);
      collectionRepo.save.mockResolvedValue(saved);
      const result = await service.createCollection('user-1', { name: 'Integrity Test', description: 'desc' });
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Integrity Test');
      expect(result.description).toBe('desc');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should preserve notes and priority on update', async () => {
      const item = baseItem();
      itemRepo.findOne.mockResolvedValue(item);
      const updated = { ...item, notes: 'Updated note', priority: 1 };
      itemRepo.save.mockResolvedValue(updated);
      const result = await service.updateItem('item-1', 'user-1', { notes: 'Updated note', priority: 1 });
      expect(result.notes).toBe('Updated note');
      expect(result.priority).toBe(1);
    });
  });

  // 10. Share token uniqueness
  describe('Share token generation', () => {
    it('should generate unique-looking token', async () => {
      collectionRepo.findOne.mockResolvedValue(baseCollection());
      const saved = { ...baseCollection(), shareToken: 'abcdef1234567890' };
      collectionRepo.save.mockResolvedValue(saved);
      const token = await service.generateShareToken('col-1', 'user-1');
      expect(token.length).toBe(16);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  // 11. Verify non-existent user
  describe('Non-existent user', () => {
    it('should return empty collections for unknown user', async () => {
      collectionRepo.find.mockResolvedValue([]);
      const result = await service.getCollections('nonexistent-user');
      expect(result).toEqual([]);
    });
  });

  // 12. Cascade delete behavior
  describe('Cascade delete', () => {
    it('should remove collection (items cascade)', async () => {
      const col = baseCollection();
      collectionRepo.findOne.mockResolvedValue(col);
      await service.deleteCollection('col-1', 'user-1');
      expect(collectionRepo.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'col-1', userId: 'user-1' }));
    });
  });
});
