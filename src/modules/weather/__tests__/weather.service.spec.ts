import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WeatherService } from '../weather.service';
import { Trek } from '../../treks/entities/trek.entity';
import { RedisService } from '../../../common/utils/redis.service';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';

describe('WeatherService', () => {
  let service: WeatherService;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let redisService: jest.Mocked<RedisService>;

  const mockTrek = {
    id: 'trek-1',
    latitude: 27.9878,
    longitude: 86.925,
    location: 'Everest Base Camp',
  } as Trek;

  const mockApiResponse = {
    location: {
      name: 'Everest Base Camp',
      lat: 27.9878,
      lon: 86.925,
      country: 'NP',
    },
    current: {
      temp_c: 8,
      feelslike_c: 5,
      wind_kph: 12,
      humidity: 45,
      condition: { code: 1003, text: 'Partly cloudy' },
    },
    forecast: {
      forecastday: [
        {
          date: '2026-06-29',
          astro: { sunrise: '05:30 AM', sunset: '06:45 PM' },
          day: {
            maxtemp_c: 12,
            mintemp_c: 2,
            condition: { code: 1003 },
            daily_chance_of_rain: 10,
          },
          hour: [
            {
              time: '2026-06-29 12:00',
              temp_c: 10,
              condition: { code: 1000 },
              chance_of_rain: 0,
            },
          ],
        },
      ],
    },
  };

  const mockWeatherData = {
    location: { lat: 27.9878, lng: 86.925, name: 'Everest Base Camp' },
    current: {
      temperatureC: 8,
      feelsLikeC: 5,
      condition: 'partly_cloudy',
      windSpeedKmph: 12,
      humidityPercent: 45,
      sunrise: '05:30 AM',
      sunset: '06:45 PM',
    },
    hourly: [
      {
        time: '2026-06-29 12:00',
        temperatureC: 10,
        condition: 'clear',
        precipitationPercent: 0,
      },
    ],
    days: [
      {
        date: '2026-06-29',
        highC: 12,
        lowC: 2,
        condition: 'partly_cloudy',
        precipitationPercent: 10,
      },
    ],
    fetchedAt: expect.any(String),
    source: 'WeatherAPI.com',
  };

  let originalFetch: typeof global.fetch;
  let originalApiKey: string | undefined;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalApiKey = process.env.WEATHER_API_KEY;
    process.env.WEATHER_API_KEY = 'test-key';
    global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as any);
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.WEATHER_API_KEY;
    } else {
      process.env.WEATHER_API_KEY = originalApiKey;
    }
  });

  beforeEach(async () => {
    trekRepo = {
      findOne: jest.fn(),
    } as any;

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: getRepositoryToken(Trek), useValue: trekRepo },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get(WeatherService);
  });

  describe('getForTrek', () => {
    it('should fetch weather for a trek by ID', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrek);
      redisService.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-1');

      expect(result.location.name).toBe('Everest Base Camp');
      expect(trekRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'trek-1' },
        select: ['id', 'latitude', 'longitude', 'location'],
      });
    });

    it('should throw if trek not found', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(service.getForTrek('nonexistent')).rejects.toThrow(
        'Trek not found',
      );
    });

    it('should throw if trek has no coordinates', async () => {
      trekRepo.findOne.mockResolvedValue({
        ...mockTrek,
        latitude: null,
        longitude: null,
      } as any);
      await expect(service.getForTrek('trek-1')).rejects.toThrow(
        'Trek has no location coordinates',
      );
    });
  });

  describe('getForCoordinates', () => {
    it('should return cached data when available', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockWeatherData));

      const result = await service.getForCoordinates(27.9878, 86.925);

      expect(result.location.name).toBe('Everest Base Camp');
    });

    it('should fetch and cache when cache misses', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.getForCoordinates(27.9878, 86.925);

      expect(result.location.name).toBe('Everest Base Camp');
      expect(redisService.set).toHaveBeenCalled();
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should handle redis cache read failure gracefully', async () => {
      redisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getForCoordinates(27.9878, 86.925);

      expect(result.location.name).toBe('Everest Base Camp');
    });

    it('should handle redis cache write failure gracefully', async () => {
      redisService.get.mockResolvedValue(null);
      redisService.set.mockRejectedValue(new Error('Redis write error'));

      const result = await service.getForCoordinates(27.9878, 86.925);

      expect(result.location.name).toBe('Everest Base Camp');
    });
  });
});
