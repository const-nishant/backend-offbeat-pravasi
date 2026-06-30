import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistController } from '../wishlist.controller';
import { WishlistService } from '../wishlist.service';
import { WishlistCollection } from '../entities/wishlist-collection.entity';
import { WishlistItem } from '../entities/wishlist-item.entity';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

describe('WishlistController', () => {
  let controller: WishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  const mockUser: AuthenticatedUser = { id: 'user-1', email: 'test@test.com', isAdmin: false };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getCollections: jest.fn(),
            createCollection: jest.fn(),
            updateCollection: jest.fn(),
            deleteCollection: jest.fn(),
            getItems: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            quickAdd: jest.fn(),
            generateShareToken: jest.fn(),
            getSharedCollection: jest.fn(),
            toggleSave: jest.fn(),
            getTrekStatus: jest.fn(),
            getAllItems: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
    wishlistService = module.get(WishlistService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCollections', () => {
    it('should return user collections', async () => {
      wishlistService.getCollections.mockResolvedValue([{ id: 'col-1', name: 'Bucket List' } as any]);
      const result = await controller.getCollections(mockUser);
      expect(result).toHaveLength(1);
      expect(wishlistService.getCollections).toHaveBeenCalledWith('user-1');
    });
  });

  describe('createCollection', () => {
    it('should create and return a collection', async () => {
      const dto = { name: 'New Collection' };
      wishlistService.createCollection.mockResolvedValue({ id: 'col-1', name: 'New Collection' } as any);
      const result = await controller.createCollection(mockUser, dto);
      expect(result.name).toBe('New Collection');
      expect(wishlistService.createCollection).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('updateCollection', () => {
    it('should update a collection', async () => {
      const dto = { name: 'Updated' };
      wishlistService.updateCollection.mockResolvedValue({ id: 'col-1', name: 'Updated' } as any);
      const result = await controller.updateCollection(mockUser, 'col-1', dto);
      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection', async () => {
      wishlistService.deleteCollection.mockResolvedValue(undefined);
      await controller.deleteCollection(mockUser, 'col-1');
      expect(wishlistService.deleteCollection).toHaveBeenCalledWith('col-1', 'user-1');
    });
  });

  describe('getItems', () => {
    it('should return items in collection', async () => {
      wishlistService.getItems.mockResolvedValue([{ id: 'item-1', trekId: 'trek-1' } as any]);
      const result = await controller.getItems(mockUser, 'col-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('addItem', () => {
    it('should add trek to collection', async () => {
      const dto = { trekId: 'trek-1' };
      wishlistService.addItem.mockResolvedValue({ id: 'item-1', trekId: 'trek-1' } as any);
      const result = await controller.addItem(mockUser, 'col-1', dto);
      expect(result.trekId).toBe('trek-1');
    });
  });

  describe('updateItem', () => {
    it('should update wishlist item', async () => {
      const dto = { notes: 'Great!' };
      wishlistService.updateItem.mockResolvedValue({ id: 'item-1', notes: 'Great!' } as any);
      const result = await controller.updateItem(mockUser, 'item-1', dto);
      expect(result.notes).toBe('Great!');
    });
  });

  describe('removeItem', () => {
    it('should remove item', async () => {
      await controller.removeItem(mockUser, 'item-1');
      expect(wishlistService.removeItem).toHaveBeenCalledWith('item-1', 'user-1');
    });
  });

  describe('quickAdd', () => {
    it('should quick-add trek', async () => {
      wishlistService.quickAdd.mockResolvedValue({ id: 'item-1', trekId: 'trek-1' } as any);
      const result = await controller.quickAdd(mockUser, 'trek-1');
      expect(result.trekId).toBe('trek-1');
    });
  });

  describe('shareCollection', () => {
    it('should generate share token', async () => {
      wishlistService.generateShareToken.mockResolvedValue('abc123');
      const result = await controller.shareCollection(mockUser, 'col-1');
      expect(result.shareToken).toBe('abc123');
    });
  });

  describe('getSharedCollection', () => {
    it('should return shared collection', async () => {
      wishlistService.getSharedCollection.mockResolvedValue({ id: 'col-1', name: 'Shared', items: [] } as any);
      const result = await controller.getSharedCollection('token-123');
      expect(result.name).toBe('Shared');
    });
  });

  describe('toggleSave', () => {
    it('should call service.toggleSave and return saved status', async () => {
      wishlistService.toggleSave.mockResolvedValue({ saved: true });
      const result = await controller.toggleSave(mockUser, 'trek-1');
      expect(result).toEqual({ saved: true });
      expect(wishlistService.toggleSave).toHaveBeenCalledWith('trek-1', 'user-1');
    });

    it('should return saved:false when removing', async () => {
      wishlistService.toggleSave.mockResolvedValue({ saved: false });
      const result = await controller.toggleSave(mockUser, 'trek-1');
      expect(result).toEqual({ saved: false });
    });
  });

  describe('getTrekStatus', () => {
    it('should return saved and collectionIds', async () => {
      wishlistService.getTrekStatus.mockResolvedValue({ saved: true, collectionIds: ['col-1'] });
      const result = await controller.getTrekStatus(mockUser, 'trek-1');
      expect(result).toEqual({ saved: true, collectionIds: ['col-1'] });
      expect(wishlistService.getTrekStatus).toHaveBeenCalledWith('trek-1', 'user-1');
    });

    it('should return saved:false when not saved', async () => {
      wishlistService.getTrekStatus.mockResolvedValue({ saved: false, collectionIds: [] });
      const result = await controller.getTrekStatus(mockUser, 'trek-1');
      expect(result.saved).toBe(false);
    });
  });

  describe('getAllItems', () => {
    it('should return paginated results', async () => {
      const mockResponse = { data: [{ id: 'i-1', trekId: 't-1' }], meta: { total: 1, page: 1 } };
      wishlistService.getAllItems.mockResolvedValue(mockResponse as any);
      const result = await controller.getAllItems(mockUser, 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(wishlistService.getAllItems).toHaveBeenCalledWith('user-1', 1, 20);
    });

    it('should default page/limit when not provided', async () => {
      wishlistService.getAllItems.mockResolvedValue({ data: [], meta: { total: 0, page: 1 } } as any);
      await controller.getAllItems(mockUser, undefined, undefined);
      expect(wishlistService.getAllItems).toHaveBeenCalledWith('user-1', undefined, undefined);
    });
  });
});
