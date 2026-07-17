import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminNotificationPreference } from './entities/admin-notification-preference.entity';

@Injectable()
export class AdminNotificationPreferenceService {
  constructor(
    @InjectRepository(AdminNotificationPreference)
    private readonly repo: Repository<AdminNotificationPreference>,
  ) {}

  async getPreferences(adminId: string) {
    const prefs = await this.repo.find({ where: { adminId } });
    return prefs;
  }

  async update(
    adminId: string,
    entries: { eventType: string; channel: string; enabled: boolean }[],
  ) {
    const results: AdminNotificationPreference[] = [];

    for (const entry of entries) {
      const existing = await this.repo.findOne({
        where: { adminId, eventType: entry.eventType, channel: entry.channel },
      });

      if (existing) {
        existing.enabled = entry.enabled;
        results.push(await this.repo.save(existing));
      } else {
        const pref = this.repo.create({ adminId, ...entry });
        results.push(await this.repo.save(pref));
      }
    }

    return results;
  }

  async test(adminId: string) {
    const prefs = await this.repo.find({ where: { adminId, enabled: true } });
    const channels = [...new Set(prefs.map((p) => p.channel))];
    return {
      message: `Test notification would be sent via: ${channels.join(', ') || 'none'}`,
      channels,
    };
  }
}
