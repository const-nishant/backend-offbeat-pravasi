import { Test, type TestingModule } from '@nestjs/testing';
import { GearController } from '../gear.controller';
import { GearService } from '../gear.service';
import { CreateGearItemDto } from '../dtos/create-gear-item.dto';
import { SetTrekGearDto } from '../dtos/set-trek-gear.dto';
import { UpdatePackingItemDto } from '../dtos/update-packing-item.dto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

describe('GearController', () => {
  let controller: GearController;
  let service: jest.Mocked<GearService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@test.com',
    isAdmin: false,
  };

  beforeEach(async () => {
    service = {
      getAllGearItems: jest.fn(),
      createGearItem: jest.fn(),
      updateGearItem: jest.fn(),
      getTrekGear: jest.fn(),
      setTrekGear: jest.fn(),
      getPackingList: jest.fn(),
      updatePackingItem: jest.fn(),
      confirmRentals: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GearController],
      providers: [{ provide: GearService, useValue: service }],
    }).compile();

    controller = module.get(GearController);
  });

  it('getAllGearItems should call service', async () => {
    service.getAllGearItems.mockResolvedValue([]);
    await controller.getAllGearItems();
    expect(service.getAllGearItems).toHaveBeenCalled();
  });

  it('createGearItem should call service with dto', async () => {
    const dto: CreateGearItemDto = { name: 'Test', category: 'CLOTHING' as any };
    service.createGearItem.mockResolvedValue({ id: 'g-1', ...dto } as any);
    const result = await controller.createGearItem(dto);
    expect(service.createGearItem).toHaveBeenCalledWith(dto);
    expect(result).toBeDefined();
  });

  it('updateGearItem should call service with id and dto', async () => {
    const dto: Partial<CreateGearItemDto> = { name: 'Updated' };
    service.updateGearItem.mockResolvedValue({ id: 'g-1', name: 'Updated' } as any);
    await controller.updateGearItem('g-1', dto);
    expect(service.updateGearItem).toHaveBeenCalledWith('g-1', dto);
  });

  it('getTrekGear should call service with trekId', async () => {
    service.getTrekGear.mockResolvedValue([]);
    await controller.getTrekGear('trek-1');
    expect(service.getTrekGear).toHaveBeenCalledWith('trek-1');
  });

  it('setTrekGear should call service with trekId, userId, dto', async () => {
    const dto: SetTrekGearDto = { items: [{ gearItemId: 'g-1', requirementType: 'REQUIRED' as any }] };
    service.setTrekGear.mockResolvedValue([]);
    await controller.setTrekGear('trek-1', dto, mockUser);
    expect(service.setTrekGear).toHaveBeenCalledWith('trek-1', 'user-1', dto);
  });

  it('getPackingList should call service with bookingId and userId', async () => {
    service.getPackingList.mockResolvedValue([]);
    await controller.getPackingList('booking-1', mockUser);
    expect(service.getPackingList).toHaveBeenCalledWith('booking-1', 'user-1');
  });

  it('updatePackingItem should call service', async () => {
    const dto: UpdatePackingItemDto = { checked: true };
    service.updatePackingItem.mockResolvedValue({} as any);
    await controller.updatePackingItem('booking-1', 'pli-1', dto, mockUser);
    expect(service.updatePackingItem).toHaveBeenCalledWith('booking-1', 'pli-1', 'user-1', dto);
  });

  it('confirmRentals should call service with bookingId and userId', async () => {
    service.confirmRentals.mockResolvedValue({ addedCost: 500 });
    const result = await controller.confirmRentals('booking-1', mockUser);
    expect(service.confirmRentals).toHaveBeenCalledWith('booking-1', 'user-1');
    expect(result).toEqual({ addedCost: 500 });
  });
});
