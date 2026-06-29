import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItineraryDay } from './entities/itinerary-day.entity';
import { Trek } from '../treks/entities/trek.entity';
import { CreateItineraryDayDto } from './dtos/create-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dtos/update-itinerary-day.dto';

@Injectable()
export class ItinerariesService {
  constructor(
    @InjectRepository(ItineraryDay)
    private readonly itineraryRepo: Repository<ItineraryDay>,
    @InjectRepository(Trek)
    private readonly trekRepo: Repository<Trek>,
  ) {}

  async getByTrek(trekId: string): Promise<ItineraryDay[]> {
    return this.itineraryRepo.find({
      where: { trekId },
      order: { dayNumber: 'ASC' },
    });
  }

  async addDay(
    trekId: string,
    userId: string,
    dto: CreateItineraryDayDto,
  ): Promise<ItineraryDay> {
    await this.verifyOrganizerOwnership(trekId, userId);

    const day = this.itineraryRepo.create({
      ...dto,
      trekId,
    });
    return this.itineraryRepo.save(day);
  }

  async upsertDays(
    trekId: string,
    userId: string,
    days: CreateItineraryDayDto[],
  ): Promise<ItineraryDay[]> {
    await this.verifyOrganizerOwnership(trekId, userId);

    await this.itineraryRepo.delete({ trekId });
    const entities = days.map((dto) =>
      this.itineraryRepo.create({ ...dto, trekId }),
    );
    return this.itineraryRepo.save(entities);
  }

  async updateDay(
    dayId: string,
    userId: string,
    dto: UpdateItineraryDayDto,
  ): Promise<ItineraryDay> {
    const day = await this.itineraryRepo.findOne({ where: { id: dayId } });
    if (!day) throw new NotFoundException('Itinerary day not found');

    await this.verifyOrganizerOwnership(day.trekId, userId);

    Object.assign(day, dto);
    return this.itineraryRepo.save(day);
  }

  async deleteDay(dayId: string, userId: string): Promise<void> {
    const day = await this.itineraryRepo.findOne({ where: { id: dayId } });
    if (!day) throw new NotFoundException('Itinerary day not found');

    await this.verifyOrganizerOwnership(day.trekId, userId);

    await this.itineraryRepo.remove(day);
  }

  async reorder(
    trekId: string,
    userId: string,
    dayIds: string[],
  ): Promise<ItineraryDay[]> {
    await this.verifyOrganizerOwnership(trekId, userId);

    const days = await this.itineraryRepo.find({
      where: { trekId },
    });

    const dayMap = new Map(days.map((d) => [d.id, d]));

    // Phase 1: move all days to temporary negative positions to avoid unique constraint violations
    for (const day of days) {
      day.dayNumber = -day.dayNumber;
    }
    await this.itineraryRepo.save(days);

    // Phase 2: assign correct day order
    const saved: ItineraryDay[] = [];
    for (let i = 0; i < dayIds.length; i++) {
      const day = dayMap.get(dayIds[i]);
      if (!day) throw new NotFoundException(`Day ${dayIds[i]} not found`);
      day.dayNumber = i + 1;
      saved.push(await this.itineraryRepo.save(day));
    }

    return saved;
  }

  private async verifyOrganizerOwnership(
    trekId: string,
    userId: string,
  ): Promise<void> {
    const trek = await this.trekRepo.findOne({
      where: { id: trekId },
      relations: ['organizer'],
    });
    if (!trek) throw new NotFoundException('Trek not found');

    const organizerId =
      typeof trek.organizer === 'object' && trek.organizer !== null
        ? (trek.organizer as unknown as { id: string }).id
        : null;

    if (organizerId !== userId) {
      throw new ForbiddenException('You do not own this trek');
    }
  }
}
