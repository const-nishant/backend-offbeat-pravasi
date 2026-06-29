import {
  DataSource,
  Repository,
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { WeatherService } from '../weather.service';
import { RedisService } from '../../../common/utils/redis.service';
import {
  describe,
  beforeAll,
  afterAll,
  test,
  expect,
  beforeEach,
  jest,
} from '@jest/globals';

@Entity({ name: 'treks' })
class SqliteTrek {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) location!:
    | string
    | null;
  @Column({ type: 'float', nullable: true }) latitude!: number | null;
  @Column({ type: 'float', nullable: true }) longitude!: number | null;
}

const mockApiResponse = {
  location: { name: 'Annapurna Base Camp', lat: 28.5961, lon: 83.8203 },
  current: {
    temp_c: 5,
    feelslike_c: 2,
    wind_kph: 8,
    humidity: 60,
    condition: { code: 1006 },
  },
  forecast: {
    forecastday: [
      {
        date: '2026-07-15',
        astro: { sunrise: '05:45 AM', sunset: '07:00 PM' },
        day: {
          maxtemp_c: 8,
          mintemp_c: 0,
          condition: { code: 1006 },
          daily_chance_of_rain: 30,
        },
        hour: [
          {
            time: '2026-07-15 09:00',
            temp_c: 3,
            condition: { code: 1006 },
            chance_of_rain: 20,
          },
        ],
      },
    ],
  },
};

describe('WeatherService Integration (SQLite)', () => {
  let dataSource: DataSource;
  let trekRepo: Repository<SqliteTrek>;
  let service: WeatherService;
  let redisMock: jest.Mocked<RedisService>;
  let originalFetch: any;
  let originalApiKey: string | undefined;

  beforeAll(async () => {
    originalFetch = global.fetch;
    originalApiKey = process.env.WEATHER_API_KEY;
    process.env.WEATHER_API_KEY = 'int-test-key';

    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [SqliteTrek],
      synchronize: true,
    });
    await dataSource.initialize();

    trekRepo = dataSource.getRepository(SqliteTrek);

    redisMock = { get: jest.fn(), set: jest.fn(), del: jest.fn() } as any;

    service = new WeatherService(redisMock as any, trekRepo as any);
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = originalApiKey;
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM treks');
    global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });
    redisMock.get.mockReset();
    redisMock.set.mockReset();
  });

  test('should read coordinates from SQLite and fetch weather', async () => {
    await trekRepo.save({
      id: 'trek-abc',
      location: 'Annapurna Base Camp',
      latitude: 28.5961,
      longitude: 83.8203,
    });

    redisMock.get.mockResolvedValue(null);

    const result = await service.getForTrek('trek-abc');

    expect(result.location.name).toBe('Annapurna Base Camp');
    expect(result.current.temperatureC).toBe(5);
    expect(result.source).toBe('WeatherAPI.com');
  });

  test('should return cached result without hitting API on second call', async () => {
    await trekRepo.save({
      id: 'trek-xyz',
      location: 'Poon Hill',
      latitude: 28.3969,
      longitude: 83.6906,
    });

    const cachedData = JSON.stringify({
      location: { lat: 28.3969, lng: 83.6906, name: 'Poon Hill' },
      current: {
        temperatureC: 10,
        feelsLikeC: 8,
        condition: 'clear',
        windSpeedKmph: 5,
        humidityPercent: 40,
        sunrise: '06:00 AM',
        sunset: '06:30 PM',
      },
      hourly: [],
      days: [],
      fetchedAt: new Date().toISOString(),
      source: 'WeatherAPI.com',
    });

    redisMock.get.mockResolvedValueOnce(cachedData);

    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    const result = await service.getForTrek('trek-xyz');

    expect(result.current.temperatureC).toBe(10);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('should reject trek stored without coordinates', async () => {
    await trekRepo.save({
      id: 'trek-no-coords',
      location: 'Mystery Valley',
      latitude: null,
      longitude: null,
    });

    await expect(service.getForTrek('trek-no-coords')).rejects.toThrow(
      'Trek has no location coordinates',
    );
  });

  test('should store fetched data in Redis cache with TTL', async () => {
    await trekRepo.save({
      id: 'trek-cache-test',
      location: 'Ghorepani',
      latitude: 28.4,
      longitude: 83.7,
    });

    redisMock.get.mockResolvedValue(null);

    await service.getForTrek('trek-cache-test');

    expect(redisMock.set).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = redisMock.set.mock.calls[0];
    expect(key).toContain('weather:coord:');
    const parsed = JSON.parse(value);
    expect(parsed.source).toBe('WeatherAPI.com');
    expect(ttl).toBe(7200);
  });

  test('should handle API failure and propagate error', async () => {
    await trekRepo.save({
      id: 'trek-api-fail',
      location: 'Jomsom',
      latitude: 28.78,
      longitude: 83.73,
    });

    global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    redisMock.get.mockResolvedValue(null);

    await expect(service.getForTrek('trek-api-fail')).rejects.toThrow(
      'Weather API responded with 503',
    );
  });

  test('should gracefully degrade when Redis write fails', async () => {
    await trekRepo.save({
      id: 'trek-redis-fail',
      location: 'Mustang',
      latitude: 29.0,
      longitude: 84.0,
    });

    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockRejectedValue(new Error('Redis write failed'));

    const result = await service.getForTrek('trek-redis-fail');
    expect(result.current.temperatureC).toBe(5);
  });

  test('should handle multiple treks independently', async () => {
    await trekRepo.save([
      { id: 't1', location: 'Trek A', latitude: 10, longitude: 20 },
      { id: 't2', location: 'Trek B', latitude: 30, longitude: 40 },
    ]);

    redisMock.get.mockResolvedValue(null);

    const [r1, r2] = await Promise.all([
      service.getForTrek('t1'),
      service.getForTrek('t2'),
    ]);

    expect(r1.location.name).toBe('Annapurna Base Camp');
    expect(r2.location.name).toBe('Annapurna Base Camp');
  });
});
