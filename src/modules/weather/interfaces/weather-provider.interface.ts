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

export interface WeatherProvider {
  fetch(
    lat: number,
    lng: number,
    options?: WeatherOptions,
  ): Promise<WeatherApiResponse>;
}
