import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GearItem } from './entities/gear-item.entity';
import { TrekGearItem } from './entities/trek-gear-item.entity';
import { UserPackingListItem } from './entities/user-packing-list-item.entity';
import { CreateGearItemDto } from './dtos/create-gear-item.dto';
import { SetTrekGearDto } from './dtos/set-trek-gear.dto';
import { UpdatePackingItemDto } from './dtos/update-packing-item.dto';
import { Trek } from '../treks/entities/trek.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/entities/booking.entity';
import { RequirementType } from './enums/requirement-type.enum';

@Injectable()
export class GearService {
  private readonly logger = new Logger(GearService.name);

  constructor(
    @InjectRepository(GearItem)
    private readonly gearItemRepo: Repository<GearItem>,
    @InjectRepository(TrekGearItem)
    private readonly trekGearRepo: Repository<TrekGearItem>,
    @InjectRepository(UserPackingListItem)
    private readonly packingListRepo: Repository<UserPackingListItem>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async getAllGearItems(): Promise<GearItem[]> {
    return this.gearItemRepo.find({ order: { category: 'ASC', name: 'ASC' } });
  }

  async createGearItem(dto: CreateGearItemDto): Promise<GearItem> {
    const item = this.gearItemRepo.create(dto);
    return this.gearItemRepo.save(item);
  }

  async updateGearItem(
    id: string,
    dto: Partial<CreateGearItemDto>,
  ): Promise<GearItem> {
    const item = await this.gearItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Gear item not found');
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.category !== undefined) item.category = dto.category;
    return this.gearItemRepo.save(item);
  }

  async getTrekGear(trekId: string): Promise<TrekGearItem[]> {
    return this.trekGearRepo.find({
      where: { trekId },
      relations: ['gearItem'],
      order: { sortOrder: 'ASC' },
    });
  }

  async setTrekGear(
    trekId: string,
    userId: string,
    dto: SetTrekGearDto,
  ): Promise<TrekGearItem[]> {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId },
      relations: ['organizer'],
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const isOwner =
      trek.organizer?.id === userId ||
      trek.organizer?.id?.toString() === userId;
    if (!isOwner) {
      throw new ForbiddenException('Only the trek organizer can set gear');
    }

    const gearItemIds = dto.items.map((i) => i.gearItemId);
    const existing = await this.gearItemRepo.find({
      where: { id: In(gearItemIds) },
    });
    if (existing.length !== gearItemIds.length) {
      throw new NotFoundException('One or more gear items not found');
    }

    await this.trekGearRepo.delete({ trekId });

    const entities = dto.items.map((item, idx) =>
      this.trekGearRepo.create({
        trekId,
        gearItemId: item.gearItemId,
        requirementType: item.requirementType,
        rentalPriceInr:
          item.requirementType === RequirementType.RENTAL
            ? item.rentalPriceInr
            : undefined,
        notes: item.notes,
        sortOrder: idx,
      }),
    );

    return this.trekGearRepo.save(entities);
  }

  async getPackingList(
    bookingId: string,
    userId: string,
  ): Promise<UserPackingListItem[]> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const existing = await this.packingListRepo.find({
      where: { userId },
      relations: ['trekGearItem', 'trekGearItem.gearItem'],
    });

    if (existing.length > 0) return existing;

    const trekGear = await this.trekGearRepo.find({
      where: { trekId: booking.trekId },
      relations: ['gearItem'],
      order: { sortOrder: 'ASC' },
    });

    if (trekGear.length === 0) return [];

    const items = trekGear.map((tg) =>
      this.packingListRepo.create({
        userId,
        trekGearItemId: tg.id,
        hasItem: false,
        needsRental: false,
        checked: false,
      }),
    );

    return this.packingListRepo.save(items);
  }

  async updatePackingItem(
    bookingId: string,
    itemId: string,
    userId: string,
    dto: UpdatePackingItemDto,
  ): Promise<UserPackingListItem> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const item = await this.packingListRepo.findOne({
      where: { id: itemId, userId },
      relations: ['trekGearItem'],
    });
    if (!item) throw new NotFoundException('Packing list item not found');

    if (dto.hasItem !== undefined) item.hasItem = dto.hasItem;
    if (dto.needsRental !== undefined) {
      if (
        dto.needsRental &&
        item.trekGearItem.requirementType !== RequirementType.RENTAL
      ) {
        throw new BadRequestException('This item is not available for rental');
      }
      item.needsRental = dto.needsRental;
    }
    if (dto.checked !== undefined) item.checked = dto.checked;

    return this.packingListRepo.save(item);
  }

  async confirmRentals(
    bookingId: string,
    userId: string,
  ): Promise<{ addedCost: number }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Rentals can only be added while booking is PENDING',
      );
    }

    const rentalItems = await this.packingListRepo.find({
      where: { userId, needsRental: true },
      relations: ['trekGearItem'],
    });

    if (rentalItems.length === 0) {
      return { addedCost: 0 };
    }

    const totalRentalCost = rentalItems.reduce((sum, item) => {
      return sum + (item.trekGearItem.rentalPriceInr ?? 0);
    }, 0);

    if (totalRentalCost > 0) {
      const metadata = booking.metadata ?? {};
      metadata.rentalCostInr = totalRentalCost;
      booking.metadata = metadata;
      await this.bookingRepo.save(booking);
    }

    return { addedCost: totalRentalCost };
  }
}
