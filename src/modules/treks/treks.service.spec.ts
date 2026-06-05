import { In, type Repository } from 'typeorm';
import { TreksService } from './treks.service';
import type { RedisService } from '../../common/utils/redis.service';
import type { Trek } from './entities/trek.entity';
import type { TrekReview } from './entities/trek-review.entity';
import type { TrekInteraction } from './entities/trek-interaction.entity';
import type { TrekTag } from './entities/trek-tag.entity';
import type { TrekImage } from './entities/trek-image.entity';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('TreksService', () => {
  let service: TreksService;

  const trekRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findBy: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reviewRepo = {} as Repository<TrekReview>;
  const userRepo = {
    findOne: jest.fn(),
  } as unknown as Repository<any>;
  const interactionRepo = {
    find: jest.fn(),
  };
  const tagRepo = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const imageRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const redisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  } as unknown as RedisService;

  const buildQueryBuilder = () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getRawAndEntities: jest.fn(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    trekRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TreksService(
      trekRepo as unknown as Repository<Trek>,
      userRepo,
      reviewRepo,
      interactionRepo as unknown as Repository<TrekInteraction>,
      tagRepo as unknown as Repository<TrekTag>,
      imageRepo as unknown as Repository<TrekImage>,
      redisService,
    );
  });

  it('creates a trek with tags and images', async () => {
    const payload = {
      name: 'Kedarkantha',
      tags: ['snow', 'winter'],
      imageKeys: ['images/1.jpg', 'images/2.jpg'],
    };
    const trek = { id: 'trek-1', ...payload };
    const tagRecords = [{ name: 'snow' }, { name: 'winter' }];

    trekRepo.create.mockReturnValue(trek);
    trekRepo.save.mockResolvedValue(trek);
    tagRepo.find.mockResolvedValue([]);
    tagRepo.create.mockImplementation((value) => value);
    tagRepo.save.mockResolvedValue(tagRecords);
    imageRepo.create.mockImplementation((value) => value);
    imageRepo.save.mockResolvedValue([]);
    userRepo.findOne = jest.fn().mockResolvedValue({
      id: 'user-1',
      organizerStatus: 'APPROVED',
      isOrganizerActive: true,
    });

    await expect(service.createTrek(payload, 'user-1')).resolves.toEqual(trek);

    expect(tagRepo.find).toHaveBeenCalledWith({
      where: { name: In(['snow', 'winter']) },
    });
    expect(imageRepo.save).toHaveBeenCalledTimes(1);
    expect(imageRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        key: 'images/1.jpg',
        isPrimary: true,
        order: 0,
      }),
      expect.objectContaining({
        key: 'images/2.jpg',
        isPrimary: false,
        order: 1,
      }),
    ]);
  });

  it('searches treks with pagination and ranking', async () => {
    const qb = buildQueryBuilder();
    qb.getManyAndCount.mockResolvedValue([[{ id: 'trek-1' }], 1]);

    await expect(
      service.search({ q: 'snow', page: 2, limit: 5, sort: 'relevance' }),
    ).resolves.toEqual({
      data: [{ id: 'trek-1' }],
      meta: { page: 2, limit: 5, total: 1, totalPages: 1 },
    });

    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('rank', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
  });

  it('finds nearby treks and maps distance meters', async () => {
    const qb = buildQueryBuilder();
    qb.getRawAndEntities.mockResolvedValue({
      raw: [{ distance: '123.4' }],
      entities: [{ id: 'trek-1', name: 'Kedarkantha' }],
    });
    qb.getCount.mockResolvedValue(1);

    await expect(service.nearby(12.34, 56.78, 1000, 1, 10)).resolves.toEqual({
      data: [{ id: 'trek-1', name: 'Kedarkantha', distanceMeters: 123.4 }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('builds personalized recommendations from cached similarities', async () => {
    redisService.get = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify([{ id: 'trek-2', score: 0.9 }]));

    interactionRepo.find = jest
      .fn()
      .mockResolvedValue([{ trek: { id: 'trek-1' }, type: 'BOOKMARK' }]);
    trekRepo.findBy = jest.fn().mockResolvedValue([{ id: 'trek-2' }]);
    trekRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    await expect(
      service.getRecommendations('user-1', undefined, undefined, 5),
    ).resolves.toEqual([{ id: 'trek-2' }]);

    expect(redisService.set).toHaveBeenCalledWith(
      'user:recs:user-1',
      JSON.stringify([{ id: 'trek-2' }]),
      8 * 3600,
    );
  });
  it('forbids trek creation for non-approved organizer', async () => {
    const payload = { name: 'Test Trek' };
    userRepo.findOne = jest.fn().mockResolvedValue({
      id: 'user-2',
      organizerStatus: 'PENDING',
      isOrganizerActive: false,
    });

    await expect(service.createTrek(payload, 'user-2')).rejects.toThrow(
      'User is not an active organizer',
    );
  });

  it('allows admin to create a trek even if not an active organizer', async () => {
    const payload = { name: 'Admin Trek', imageKeys: [] };
    const trek = { id: 'trek-admin', ...payload };

    trekRepo.create.mockReturnValue(trek);
    trekRepo.save.mockResolvedValue(trek);
    tagRepo.find.mockResolvedValue([]);
    imageRepo.create.mockImplementation((value) => value);
    imageRepo.save.mockResolvedValue([]);

    userRepo.findOne = jest.fn().mockResolvedValue({
      id: 'admin-1',
      isAdmin: true,
      organizerStatus: 'NONE',
      isOrganizerActive: false,
    });

    await expect(service.createTrek(payload, 'admin-1')).resolves.toEqual(
      trek,
    );
  });

  it('falls back to popular treks for anonymous users', async () => {
    const qb = buildQueryBuilder();
    qb.getMany.mockResolvedValue([{ id: 'trek-1' }]);

    await expect(
      service.getRecommendations(null, undefined, undefined, 3),
    ).resolves.toEqual([{ id: 'trek-1' }]);
    expect(qb.orderBy).toHaveBeenCalledWith('t.popularityScore', 'DESC');
  });
});
