import { Test, type TestingModule } from '@nestjs/testing';
import { WeatherController } from '../weather.controller';
import { WeatherService } from '../weather.service';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('WeatherController', () => {
  let controller: WeatherController;
  let weatherService: jest.Mocked<WeatherService>;

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
    hourly: [],
    days: [],
    fetchedAt: '2026-06-29T10:00:00.000Z',
    source: 'WeatherAPI.com',
  };

  beforeEach(async () => {
    weatherService = {
      getForTrek: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [{ provide: WeatherService, useValue: weatherService }],
    }).compile();

    controller = module.get(WeatherController);
  });

  describe('getWeather', () => {
    it('should return weather for a trek', async () => {
      weatherService.getForTrek.mockResolvedValue(mockWeatherData);

      const result = await controller.getWeather('trek-1', {});
      expect(result).toEqual(mockWeatherData);
      expect(weatherService.getForTrek).toHaveBeenCalledWith(
        'trek-1',
        undefined,
      );
    });

    it('should pass dates to service when provided', async () => {
      weatherService.getForTrek.mockResolvedValue(mockWeatherData);

      await controller.getWeather('trek-1', {
        dates: ['2026-09-15', '2026-09-20'],
      });

      expect(weatherService.getForTrek).toHaveBeenCalledWith('trek-1', [
        new Date('2026-09-15'),
        new Date('2026-09-20'),
      ]);
    });

    it('should return weather with correct location name', async () => {
      weatherService.getForTrek.mockResolvedValue(mockWeatherData);

      const result = await controller.getWeather('trek-1', {});
      expect(result.location.name).toBe('Everest Base Camp');
    });

    it('should propagate errors from service', async () => {
      weatherService.getForTrek.mockRejectedValue(new Error('Trek not found'));

      await expect(controller.getWeather('invalid-id', {})).rejects.toThrow(
        'Trek not found',
      );
    });
  });
});
