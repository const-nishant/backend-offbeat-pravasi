export interface WeatherOptions {
  days?: number;
  date?: string;
}

export interface WeatherApiResponse {
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  current: {
    temperatureC: number;
    feelsLikeC: number;
    condition: string;
    windSpeedKmph: number;
    humidityPercent: number;
    sunrise: string;
    sunset: string;
  };
  hourly: Array<{
    time: string;
    temperatureC: number;
    condition: string;
    precipitationPercent: number;
  }>;
  days: Array<{
    date: string;
    highC: number;
    lowC: number;
    condition: string;
    precipitationPercent: number;
  }>;
  source: string;
}

// ponytail: single weather provider, no interface/factory indirection needed
export class WeatherApiProvider {
  async fetch(
    lat: number,
    lng: number,
    options?: WeatherOptions,
  ): Promise<WeatherApiResponse> {
    const { apiKey, baseUrl } = getConfig();

    if (!apiKey) {
      throw new Error('WEATHER_API_KEY is not configured');
    }

    const params = new URLSearchParams({
      key: apiKey,
      q: `${lat},${lng}`,
      days: String(options?.days ?? 7),
      aqi: 'no',
      alerts: 'no',
    });

    const url = `${baseUrl}/forecast.json?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Weather API responded with ${response.status}: ${response.statusText}`,
      );
    }

    const raw = await response.json();

    return {
      location: {
        lat: raw.location.lat,
        lng: raw.location.lon,
        name: raw.location.name,
      },
      current: {
        temperatureC: raw.current.temp_c,
        feelsLikeC: raw.current.feelslike_c,
        condition: mapCondition(raw.current.condition.code),
        windSpeedKmph: raw.current.wind_kph,
        humidityPercent: raw.current.humidity,
        sunrise: raw.forecast.forecastday[0]?.astro.sunrise ?? '',
        sunset: raw.forecast.forecastday[0]?.astro.sunset ?? '',
      },
      hourly: (raw.forecast.forecastday[0]?.hour ?? []).map((h: any) => ({
        time: h.time,
        temperatureC: h.temp_c,
        condition: mapCondition(h.condition.code),
        precipitationPercent: h.chance_of_rain ?? 0,
      })),
      days: (raw.forecast.forecastday ?? []).map((d: any) => ({
        date: d.date,
        highC: d.day.maxtemp_c,
        lowC: d.day.mintemp_c,
        condition: mapCondition(d.day.condition.code),
        precipitationPercent: d.day.daily_chance_of_rain ?? 0,
      })),
      source: 'WeatherAPI.com',
    };
  }
}

function mapCondition(code: number): string {
  if (code >= 1000 && code <= 1003) return 'clear';
  if (code >= 1004 && code <= 1009) return 'partly_cloudy';
  if (code >= 1010 && code <= 1030) return 'cloudy';
  if ((code >= 1063 && code <= 1072) || (code >= 1150 && code <= 1171))
    return 'rain';
  if (code >= 1180 && code <= 1201) return 'heavy_rain';
  if (code >= 1204 && code <= 1237) return 'snow';
  if (code >= 1240 && code <= 1282) return 'storm';
  return 'partly_cloudy';
}

function getConfig() {
  return {
    apiKey: process.env.WEATHER_API_KEY ?? '',
    baseUrl:
      process.env.WEATHER_API_BASE_URL ?? 'https://api.weatherapi.com/v1',
  };
}
