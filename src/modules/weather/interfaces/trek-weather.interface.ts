export interface TrekWeather {
  location: { lat: number; lng: number; name: string };
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
  fetchedAt: string;
  source: string;
}
