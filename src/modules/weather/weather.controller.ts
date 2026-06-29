import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { WeatherQueryDto } from './dtos/weather-query.dto';
import { TrekWeather } from './interfaces/trek-weather.interface';

@ApiTags('Weather')
@Controller()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('treks/:trekId/weather')
  @ApiOperation({ summary: 'Get weather for a trek location' })
  @ApiParam({ name: 'trekId', description: 'Trek ID' })
  @ApiQuery({
    name: 'dates',
    required: false,
    description: 'Filter to specific dates',
    type: [String],
  })
  async getWeather(
    @Param('trekId') trekId: string,
    @Query() query: WeatherQueryDto,
  ): Promise<TrekWeather> {
    const dates = query.dates?.map((d) => new Date(d));
    return this.weatherService.getForTrek(trekId, dates);
  }
}
