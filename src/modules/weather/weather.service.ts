import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trek } from '../treks/entities/trek.entity';
import {
  WeatherApiProvider,
  WeatherOptions,
} from './interfaces/weather-api.provider';
import { TrekWeather } from './interfaces/trek-weather.interface';
import type { RedisClient } from '../../common/utils/redis.client';
import { CacheKeys } from '../../common/constants/cache.keys';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly provider = new WeatherApiProvider();

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
    @InjectRepository(Trek)
    private readonly trekRepository: Repository<Trek>,
  ) {}

  async getForTrek(trekId: string, dates?: Date[]): Promise<TrekWeather> {
    const trek = await this.trekRepository.findOne({
      where: { id: trekId },
      select: ['id', 'latitude', 'longitude', 'location'],
    });

    if (!trek) {
      throw new Error('Trek not found');
    }

    if (
      trek.latitude === null ||
      trek.latitude === undefined ||
      trek.longitude === null ||
      trek.longitude === undefined
    ) {
      throw new Error('Trek has no location coordinates');
    }

    return this.getForCoordinates(trek.latitude, trek.longitude, dates);
  }

  async getForCoordinates(
    lat: number,
    lng: number,
    dates?: Date[],
  ): Promise<TrekWeather> {
    const datesKey = dates?.length
      ? dates
          .map((d) => d.toISOString().slice(0, 10))
          .sort()
          .join(',')
      : 'default';
    const cacheKey = CacheKeys.weatherTrek(lat, lng, datesKey);

    const cached = await this.getCached(cacheKey);
    if (cached) return cached;

    const options: WeatherOptions = {};
    if (dates?.length) {
      options.days = Math.max(
        ...dates.map((d) => {
          const diff = Math.ceil(
            (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          return diff > 0 ? diff + 2 : 7;
        }),
      );
    }

    const data = await this.fetchFromProvider(lat, lng, options);

    const trekWeather: TrekWeather = {
      location: data.location,
      current: data.current,
      hourly: data.hourly,
      days: data.days,
      fetchedAt: new Date().toISOString(),
      source: data.source,
    };

    const ttl = this.resolveTtl(dates);
    await this.setCache(cacheKey, trekWeather, ttl);

    return trekWeather;
  }

  private async fetchFromProvider(
    lat: number,
    lng: number,
    options?: WeatherOptions,
  ): Promise<TrekWeather> {
    const response = await this.provider.fetch(lat, lng, options);

    return {
      location: response.location,
      current: {
        ...response.current,
        condition: response.current.condition,
      },
      hourly: response.hourly,
      days: response.days,
      fetchedAt: new Date().toISOString(),
      source: response.source,
    };
  }

  private async getCached(key: string): Promise<TrekWeather | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw) return JSON.parse(raw) as TrekWeather;
    } catch (e) {
      this.logger.warn(
        `Redis cache read failed for key ${key}: ${(e as Error).message}`,
      );
    }
    return null;
  }

  private async setCache(
    key: string,
    data: TrekWeather,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (e) {
      this.logger.warn(
        `Redis cache write failed for key ${key}: ${(e as Error).message}`,
      );
    }
  }

  private resolveTtl(dates?: Date[]): number {
    if (!dates || dates.length === 0) {
      return 2 * 60 * 60;
    }
    const now = Date.now();
    const isCurrent = dates.some((d) => {
      const diff = Math.abs(d.getTime() - now);
      return diff < 3 * 60 * 60 * 1000;
    });
    if (isCurrent) return 30 * 60;
    return 6 * 60 * 60;
  }
}
