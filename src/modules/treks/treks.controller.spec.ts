import { Test } from '@nestjs/testing';
import { TreksController } from './treks.controller';
import { TreksService } from './treks.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('TreksController', () => {
  let controller: TreksController;
  const treksService = {
    createTrek: jest.fn(),
    search: jest.fn(),
    nearby: jest.fn(),
    getRecommendations: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TreksController],
      providers: [{ provide: TreksService, useValue: treksService }],
    }).compile();

    controller = moduleRef.get(TreksController);
    jest.clearAllMocks();
  });

  it('creates a trek', async () => {
    const dto = { name: 'Kedarkantha' };
    treksService.createTrek.mockResolvedValue({ id: 'trek-1', ...dto });

    await expect(controller.create(dto as never)).resolves.toEqual({
      id: 'trek-1',
      ...dto,
    });
    expect(treksService.createTrek).toHaveBeenCalledWith(dto);
  });

  it('lists treks with search filters', async () => {
    const query = { q: 'snow', page: 2, limit: 10 };
    treksService.search.mockResolvedValue({ data: [], meta: {} });

    await expect(controller.list(query as never)).resolves.toEqual({
      data: [],
      meta: {},
    });
    expect(treksService.search).toHaveBeenCalledWith(query);
  });

  it('fetches nearby treks', async () => {
    const query = { latitude: 12.34, longitude: 56.78, radiusMeters: 1000 };
    treksService.nearby.mockResolvedValue({ data: [], meta: {} });

    await expect(controller.nearby(query as never)).resolves.toEqual({
      data: [],
      meta: {},
    });
    expect(treksService.nearby).toHaveBeenCalledWith(
      12.34,
      56.78,
      1000,
      undefined,
      undefined,
    );
  });

  it('returns trek recommendations for the current user', async () => {
    treksService.getRecommendations.mockResolvedValue([{ id: 'trek-1' }]);

    await expect(
      controller.recommendations(
        { id: 'user-1', email: 'u@example.com', isAdmin: false },
        5,
        12,
        77,
      ),
    ).resolves.toEqual([{ id: 'trek-1' }]);

    expect(treksService.getRecommendations).toHaveBeenCalledWith(
      'user-1',
      12,
      77,
      5,
    );
  });

  it('fetches trek details by id', async () => {
    treksService.findOne.mockResolvedValue({ id: 'trek-1' });

    await expect(controller.get('trek-1')).resolves.toEqual({ id: 'trek-1' });
    expect(treksService.findOne).toHaveBeenCalledWith('trek-1');
  });
});
