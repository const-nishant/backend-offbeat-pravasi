import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettingsPreset } from './entities/platform-settings-preset.entity';
import { PlatformSettingsService } from './platform-settings.service';

@Injectable()
export class AdminPresetService {
  private readonly logger = new Logger(AdminPresetService.name);

  constructor(
    @InjectRepository(PlatformSettingsPreset)
    private readonly repo: Repository<PlatformSettingsPreset>,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async list() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async save(name: string, description: string) {
    const settings = await this.platformSettings.getSettings();

    const existing = await this.repo.findOne({ where: { name } });
    if (existing) {
      existing.settings = settings;
      existing.description = description;
      return this.repo.save(existing);
    }

    const preset = this.repo.create({
      name,
      description,
      settings,
      isBuiltIn: false,
    });

    const saved = await this.repo.save(preset);
    this.logger.log(`Saved platform settings preset: ${name}`);
    return saved;
  }

  async apply(id: string) {
    const preset = await this.repo.findOne({ where: { id } });
    if (!preset) throw new NotFoundException('Preset not found');

    await this.platformSettings.updateSettings(preset.settings);
    this.logger.log(`Applied platform settings preset: ${preset.name}`);
    return { success: true, preset: preset.name };
  }

  async delete(id: string) {
    const preset = await this.repo.findOne({ where: { id } });
    if (!preset) throw new NotFoundException('Preset not found');
    if (preset.isBuiltIn) {
      throw new NotFoundException('Cannot delete built-in preset');
    }
    await this.repo.remove(preset);
    return { success: true };
  }
}
