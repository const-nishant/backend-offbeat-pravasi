import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeatherAlert, AlertSeverity } from './entities/weather-alert.entity';

@Injectable()
export class AdminWeatherAlertService {
  private readonly logger = new Logger(AdminWeatherAlertService.name);

  constructor(
    @InjectRepository(WeatherAlert)
    private readonly repo: Repository<WeatherAlert>,
  ) {}

  async list() {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: {
    title: string;
    body: string;
    severity: AlertSeverity;
    affectedRegion?: Record<string, unknown>;
    expiresAt?: Date;
  }) {
    const alert = this.repo.create({
      title: data.title,
      body: data.body,
      severity: data.severity,
      affectedRegion: data.affectedRegion ?? null,
      expiresAt: data.expiresAt ?? null,
    });
    const saved = await this.repo.save(alert);
    this.logger.log(`Created weather alert: ${data.title}`);
    return saved;
  }

  async expire(id: string) {
    const alert = await this.repo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Weather alert not found');

    alert.isActive = false;
    alert.expiresAt = new Date();
    await this.repo.save(alert);
    this.logger.log(`Expired weather alert: ${id}`);
    return { success: true };
  }
}
