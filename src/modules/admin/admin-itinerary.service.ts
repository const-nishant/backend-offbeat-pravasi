import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ItineraryTemplate } from './entities/itinerary-template.entity';
import { ItineraryTemplateDay } from './entities/itinerary-template-day.entity';

@Injectable()
export class AdminItineraryService {
  private readonly logger = new Logger(AdminItineraryService.name);

  constructor(
    @InjectRepository(ItineraryTemplate)
    private readonly templateRepo: Repository<ItineraryTemplate>,
    @InjectRepository(ItineraryTemplateDay)
    private readonly dayRepo: Repository<ItineraryTemplateDay>,
    private readonly dataSource: DataSource,
  ) {}

  async list() {
    const templates = await this.templateRepo.find({
      order: { name: 'ASC' },
    });
    return templates.map((t) => ({
      ...t,
      dayCount: 0,
    }));
  }

  async create(data: {
    name: string;
    description?: string;
    region?: string;
    days: {
      dayNumber: number;
      title?: string;
      description?: string;
      activities?: string;
      accommodation?: string;
      meals?: string;
    }[];
  }) {
    const template = this.templateRepo.create({
      name: data.name,
      description: data.description ?? null,
      region: data.region ?? null,
    });
    const saved = await this.templateRepo.save(template);

    if (data.days.length > 0) {
      const days = data.days.map((d) =>
        this.dayRepo.create({ templateId: saved.id, ...d }),
      );
      await this.dayRepo.save(days);
    }

    this.logger.log(`Created itinerary template: ${data.name}`);
    return saved;
  }

  async applyToTrek(templateId: string, trekId: string) {
    const template = await this.templateRepo.findOne({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const days = await this.dayRepo.find({
      where: { templateId },
      order: { dayNumber: 'ASC' },
    });

    const existingDays = await this.dataSource.query(
      `SELECT id FROM trek_itinerary_days WHERE trek_id = $1`,
      [trekId],
    );

    if (existingDays.length > 0) {
      await this.dataSource.query(
        `DELETE FROM trek_itinerary_days WHERE trek_id = $1`,
        [trekId],
      );
    }

    for (const day of days) {
      await this.dataSource.query(
        `INSERT INTO trek_itinerary_days (trek_id, day_number, title, description, activities, accommodation, meals)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          trekId,
          day.dayNumber,
          day.title,
          day.description,
          day.activities,
          day.accommodation,
          day.meals,
        ],
      );
    }

    template.usageCount += 1;
    await this.templateRepo.save(template);

    this.logger.log(`Applied template ${templateId} to trek ${trekId}`);
    return { success: true, templateId, trekId, daysApplied: days.length };
  }
}
