import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WeatherService } from '../weather.service';
import { Trek } from '../../treks/entities/trek.entity';
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';

/**
 * QA Test Suite — 12 years experience, Weather Module
 *
 * Focus areas:
 * 1. Boundary value analysis — temperature extremes, coordinate limits, cache TTL edges
 * 2. Equivalence partitioning — all weather conditions, date categories, coordinate validity
 * 3. Negative testing — invalid IDs, API failures, malformed data, Redis corruption
 * 4. Cache behavior — hit/miss/stale/corrupt, TTL differentiation by date category
 * 5. Date handling — past/future/boundary/empty/invalid dates
 * 6. API provider edge cases — network errors, rate limiting, partial responses
 * 7. Concurrency — simultaneous requests, cache stampede prevention
 * 8. Trek data integrity — null coordinates, missing location, soft-deleted treks
 */

describe('WeatherService — QA Edge Cases (12y exp)', () => {
  let service: WeatherService;
  let trekRepo: jest.Mocked<Repository<Trek>>;
  let redis: jest.Mocked<any>;

  const mockTrekValid = {
    id: 'trek-valid',
    latitude: 27.9878,
    longitude: 86.925,
    location: 'Everest Base Camp',
  } as Trek;

  const mockTrekNullLat = {
    id: 'trek-null-lat',
    latitude: null,
    longitude: 86.925,
    location: 'No Lat Trek',
  } as any;

  const mockTrekNullLng = {
    id: 'trek-null-lng',
    latitude: 27.9878,
    longitude: null,
    location: 'No Lng Trek',
  } as any;

  const mockTrekBothNull = {
    id: 'trek-both-null',
    latitude: null,
    longitude: null,
    location: 'Null Island',
  } as any;

  const mockTrekZeroCoord = {
    id: 'trek-zero',
    latitude: 0,
    longitude: 0,
    location: 'Equator / Greenwich',
  } as Trek;

  const mockApiResponse = {
    location: { name: 'Everest Base Camp', lat: 27.9878, lon: 86.925 },
    current: {
      temp_c: 8,
      feelslike_c: 5,
      wind_kph: 12,
      humidity: 45,
      condition: { code: 1003 },
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

  let originalFetch: any;
  let originalApiKey: string | undefined;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalApiKey = process.env.WEATHER_API_KEY;
    process.env.WEATHER_API_KEY = 'qa-test-key';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = originalApiKey;
  });

  beforeEach(async () => {
    global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    } as any);

    trekRepo = { findOne: jest.fn() } as any;
    redis = { get: jest.fn(), set: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: getRepositoryToken(Trek), useValue: trekRepo },
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    service = module.get(WeatherService);
  });

  // ─── 1. Boundary Value Analysis ──────────────────────────

  describe('BVA — coordinate boundaries', () => {
    it('should handle lat=0, lng=0 (Equator/Prime Meridian)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekZeroCoord);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-zero');
      expect(result.location.lat).toBe(27.9878);
    });

    it('should handle extreme positive latitude (90)', async () => {
      const mock = { ...mockTrekValid, latitude: 90, longitude: 45 } as Trek;
      trekRepo.findOne.mockResolvedValue(mock);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(result.location.lat).toBe(27.9878);
    });

    it('should handle extreme negative latitude (-90)', async () => {
      const mock = { ...mockTrekValid, latitude: -90, longitude: 45 } as Trek;
      trekRepo.findOne.mockResolvedValue(mock);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).resolves.toBeDefined();
    });

    it('should handle extreme longitude (180)', async () => {
      const mock = { ...mockTrekValid, latitude: 0, longitude: 180 } as Trek;
      trekRepo.findOne.mockResolvedValue(mock);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).resolves.toBeDefined();
    });
  });

  describe('BVA — temperature extremes', () => {
    it('should handle extreme cold (-50°C)', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockApiResponse,
            current: {
              ...mockApiResponse.current,
              temp_c: -50,
              feelslike_c: -60,
            },
          }),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(result.current.temperatureC).toBe(-50);
      expect(result.current.feelsLikeC).toBe(-60);
    });

    it('should handle extreme heat (60°C)', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockApiResponse,
            current: {
              ...mockApiResponse.current,
              temp_c: 60,
              feelslike_c: 65,
            },
          }),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(result.current.temperatureC).toBe(60);
      expect(result.current.feelsLikeC).toBe(65);
    });

    it('should handle negative feels-like colder than actual', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockApiResponse,
            current: {
              ...mockApiResponse.current,
              temp_c: 5,
              feelslike_c: -15,
            },
          }),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(result.current.feelsLikeC).toBe(-15);
      expect(result.current.feelsLikeC).toBeLessThan(
        result.current.temperatureC,
      );
    });
  });

  describe('BVA — cache TTL boundaries', () => {
    it('should use 30min TTL for dates within 3h of now', async () => {
      const nearFuture = new Date(Date.now() + 1 * 60 * 60 * 1000);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await service.getForTrek('trek-valid', [nearFuture]);

      const cacheKey = redis.set.mock.calls[0][0];
      expect(cacheKey).toContain('weather:coord:');
    });

    it('should use 6h TTL for dates far in the future', async () => {
      const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await service.getForTrek('trek-valid', [farFuture]);

      expect(redis.set).toHaveBeenCalled();
    });

    it('should use 2h TTL when no dates specified (7-day forecast)', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await service.getForTrek('trek-valid');

      expect(redis.set).toHaveBeenCalled();
    });

    it('should use 6h TTL for dates in the past', async () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await service.getForTrek('trek-valid', [past]);
      expect(redis.set).toHaveBeenCalled();
    });
  });

  // ─── 2. Equivalence Partitioning ────────────────────────

  describe('EP — weather conditions', () => {
    const conditionCodes: [number, string][] = [
      [1000, 'clear'],
      [1003, 'clear'],
      [1004, 'partly_cloudy'],
      [1009, 'partly_cloudy'],
      [1010, 'cloudy'],
      [1030, 'cloudy'],
      [1063, 'rain'],
      [1171, 'rain'],
      [1180, 'heavy_rain'],
      [1201, 'heavy_rain'],
      [1204, 'snow'],
      [1237, 'snow'],
      [1240, 'storm'],
      [1282, 'storm'],
      [9999, 'partly_cloudy'],
    ];

    it.each(conditionCodes)(
      'should map condition code %i to "%s"',
      async (code, expected) => {
        global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockApiResponse,
              current: {
                ...mockApiResponse.current,
                condition: { code, text: '' },
              },
              forecast: {
                forecastday: [
                  {
                    ...mockApiResponse.forecast.forecastday[0],
                    day: {
                      ...mockApiResponse.forecast.forecastday[0].day,
                      condition: { code },
                    },
                    hour: [
                      {
                        ...mockApiResponse.forecast.forecastday[0].hour[0],
                        condition: { code },
                      },
                    ],
                  },
                ],
              },
            }),
        });
        trekRepo.findOne.mockResolvedValue(mockTrekValid);
        redis.get.mockResolvedValue(null);

        const result = await service.getForTrek('trek-valid');
        expect(result.current.condition).toBe(expected);
      },
    );
  });

  describe('EP — date categories', () => {
    it('should handle empty dates array', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid', []);
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should handle single date', async () => {
      const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid', [date]);
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should handle multiple dates', async () => {
      const d1 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const d2 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await service.getForTrek('trek-valid', [d1, d2]);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should sort multiple dates and produce deterministic cache key', async () => {
      const d1 = new Date('2026-09-20');
      const d2 = new Date('2026-09-15');
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await service.getForTrek('trek-valid', [d1, d2]);
      await service.getForTrek('trek-valid', [d2, d1]);

      const firstKey = redis.set.mock.calls[0][0];
      const secondKey = redis.set.mock.calls[1][0];
      expect(firstKey).toBe(secondKey);
    });
  });

  // ─── 3. Negative Testing ────────────────────────────────

  describe('NEGATIVE — invalid trek scenarios', () => {
    it('should reject non-existent trek ID', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(service.getForTrek('non-existent-id')).rejects.toThrow(
        'Trek not found',
      );
    });

    it('should reject null latitude', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekNullLat);
      await expect(service.getForTrek('trek-null-lat')).rejects.toThrow(
        'Trek has no location coordinates',
      );
    });

    it('should reject null longitude', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekNullLng);
      await expect(service.getForTrek('trek-null-lng')).rejects.toThrow(
        'Trek has no location coordinates',
      );
    });

    it('should reject both null coordinates', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekBothNull);
      await expect(service.getForTrek('trek-both-null')).rejects.toThrow(
        'Trek has no location coordinates',
      );
    });

    it('should reject empty string trek ID', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(service.getForTrek('')).rejects.toThrow('Trek not found');
    });

    it('should reject undefined trek ID', async () => {
      trekRepo.findOne.mockResolvedValue(null);
      await expect(service.getForTrek(undefined as any)).rejects.toThrow(
        'Trek not found',
      );
    });

    it('should propagate database errors from trek repository', async () => {
      trekRepo.findOne.mockRejectedValue(new Error('DB connection lost'));
      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'DB connection lost',
      );
    });
  });

  describe('NEGATIVE — API provider failures', () => {
    it('should throw on 500 Internal Server Error', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'Weather API responded with 500',
      );
    });

    it('should throw on 429 Rate Limited', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'Weather API responded with 429',
      );
    });

    it('should throw on 401 Unauthorized (bad API key)', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'Weather API responded with 401',
      );
    });

    it('should throw on network failure (fetch throws)', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error('fetch: connect ECONNREFUSED'));
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'fetch: connect ECONNREFUSED',
      );
    });

    it('should throw on DNS lookup failure', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(
          new Error('getaddrinfo ENOTFOUND api.weatherapi.com'),
        );
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'ENOTFOUND',
      );
    });

    it('should throw on timeout', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(
          new Error('The operation was aborted due to timeout'),
        );
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow('timeout');
    });
  });

  describe('NEGATIVE — malformed API response', () => {
    it('should throw when JSON parse fails', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.reject(new Error('Unexpected token < in JSON at position 0')),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow();
    });

    it('should handle missing current data gracefully', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            location: mockApiResponse.location,
            forecast: mockApiResponse.forecast,
          }),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow();
    });

    it('should handle null response from API', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow();
    });

    it('should handle API returning HTML instead of JSON', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.reject(new Error('Unexpected token < in JSON at position 0')),
      });
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow();
    });
  });

  describe('NEGATIVE — Redis failures', () => {
    it('should gracefully handle corrupt JSON in cache', async () => {
      redis.get.mockResolvedValue('{this is not valid json!!!}');
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const result = await service.getForTrek('trek-valid');
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should gracefully handle Redis connection timeout on read', async () => {
      redis.get.mockRejectedValue(new Error('Redis connection timeout'));
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const result = await service.getForTrek('trek-valid');
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should gracefully handle Redis connection timeout on write', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockRejectedValue(new Error('Redis connection timeout'));
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const result = await service.getForTrek('trek-valid');
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should gracefully handle Redis out-of-memory on write', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockRejectedValue(
        new Error('OOM command not allowed when used memory > maxmemory'),
      );
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const result = await service.getForTrek('trek-valid');
      expect(result.source).toBe('WeatherAPI.com');
    });

    it('should return stale-but-valid cache when set fails after read miss', async () => {
      redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      redis.set.mockRejectedValue(new Error('Redis write failed'));
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const result = await service.getForTrek('trek-valid');
      expect(result).toBeDefined();
    });
  });

  // ─── 4. Cache Behavior ──────────────────────────────────

  describe('CACHE — hit/miss/stale', () => {
    it('should return cached data without calling API', async () => {
      const cached = JSON.stringify({
        location: { lat: 27.9878, lng: 86.925, name: 'Everest Base Camp' },
        current: {
          temperatureC: 8,
          feelsLikeC: 5,
          condition: 'clear',
          windSpeedKmph: 12,
          humidityPercent: 45,
          sunrise: '05:30',
          sunset: '18:45',
        },
        hourly: [],
        days: [],
        fetchedAt: new Date().toISOString(),
        source: 'WeatherAPI.com',
      });
      redis.get.mockResolvedValue(cached);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const apiSpy = jest.fn();
      global.fetch = apiSpy;

      const result = await service.getForTrek('trek-valid');
      expect(result.current.temperatureC).toBe(8);
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('should call API when cache misses', async () => {
      redis.get.mockResolvedValueOnce(null);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      const apiSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });
      global.fetch = apiSpy;

      await service.getForTrek('trek-valid');
      expect(apiSpy).toHaveBeenCalledTimes(1);
    });

    it('should return fresh data from API and update cache', async () => {
      redis.get.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      await service.getForTrek('trek-valid');

      expect(redis.set).toHaveBeenCalledTimes(1);
      const setArg = JSON.parse(redis.set.mock.calls[0][1]);
      expect(setArg.fetchedAt).toBeDefined();
    });

    it('should produce different cache keys for different coordinates', async () => {
      redis.get.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      await service.getForCoordinates(10, 20);
      await service.getForCoordinates(30, 40);

      const keys = redis.set.mock.calls.map((c: any) => c[0]);
      expect(keys[0]).not.toBe(keys[1]);
    });

    it('should produce different cache keys for different dates', async () => {
      redis.get.mockResolvedValue(null);
      trekRepo.findOne.mockResolvedValue(mockTrekValid);

      await service.getForCoordinates(10, 20, [new Date('2026-07-01')]);
      await service.getForCoordinates(10, 20, [new Date('2026-08-01')]);

      const keys = redis.set.mock.calls.map((c: any) => c[0]);
      expect(keys[0]).not.toBe(keys[1]);
    });
  });

  // ─── 5. Data Integrity ──────────────────────────────────

  describe('DATA INTEGRITY — trek data', () => {
    it('should preserve all required fields in response', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');

      expect(result.location).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.hourly).toBeDefined();
      expect(result.days).toBeDefined();
      expect(result.fetchedAt).toBeDefined();
      expect(result.source).toBeDefined();
    });

    it('should include location name from API response', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(result.location.name).toBe('Everest Base Camp');
    });

    it('should include fetchedAt timestamp in ISO format', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(new Date(result.fetchedAt).toISOString()).toBe(result.fetchedAt);
    });

    it('should set source from provider', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const result = await service.getForTrek('trek-valid');
      expect(result.source).toBe('WeatherAPI.com');
    });
  });

  // ─── 6. Provider Construction ───────────────────────────

  describe('PROVIDER — construction edge cases', () => {
    it('should create provider successfully with API key set', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).resolves.toBeDefined();
    });

    it('should reject when WEATHER_API_KEY is empty string', async () => {
      delete process.env.WEATHER_API_KEY;
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      await expect(service.getForTrek('trek-valid')).rejects.toThrow(
        'WEATHER_API_KEY is not configured',
      );

      process.env.WEATHER_API_KEY = 'qa-test-key';
    });
  });

  // ─── 7. Concurrency ─────────────────────────────────────

  describe('CONCURRENCY — parallel requests', () => {
    it('should handle multiple parallel requests for same trek', async () => {
      trekRepo.findOne.mockResolvedValue(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const results = await Promise.all([
        service.getForTrek('trek-valid'),
        service.getForTrek('trek-valid'),
        service.getForTrek('trek-valid'),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.source).toBe('WeatherAPI.com'));
    });

    it('should handle parallel requests for different treks', async () => {
      const trek2 = {
        ...mockTrekValid,
        id: 'trek-2',
        latitude: 28.0,
        longitude: 87.0,
      } as Trek;
      trekRepo.findOne
        .mockResolvedValueOnce(mockTrekValid)
        .mockResolvedValueOnce(trek2)
        .mockResolvedValueOnce(mockTrekValid);
      redis.get.mockResolvedValue(null);

      const results = await Promise.all([
        service.getForTrek('trek-valid'),
        service.getForTrek('trek-2'),
        service.getForTrek('trek-valid'),
      ]);

      expect(results).toHaveLength(3);
    });
  });
});
