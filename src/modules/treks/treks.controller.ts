import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TreksService } from './treks.service';
import { CreateTrekDto } from './dtos/create-trek.dto';
import { TrekSearchDto } from './dtos/trek-search.dto';
import { NearbyDto } from './dtos/nearby.dto';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrganizerGuard } from '../../common/guards/organizer.guard';

@ApiTags('Treks')
@Controller('treks')
export class TreksController {
  constructor(private readonly treksService: TreksService) {}

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Post()
  @ApiOperation({ summary: 'Create a trek' })
  @ApiOkResponse({ description: 'Created trek' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTrekDto,
  ) {
    return this.treksService.createTrek(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List and search treks' })
  @ApiOkResponse({ description: 'Paginated trek list' })
  async list(@Query() q: TrekSearchDto) {
    return this.treksService.search(q);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find treks near a location' })
  @ApiOkResponse({ description: 'Treks near the provided coordinates' })
  async nearby(@Query() q: NearbyDto) {
    return this.treksService.nearby(
      q.latitude,
      q.longitude,
      q.radiusMeters ?? 5000,
      q.page,
      q.limit,
    );
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get trek recommendations' })
  @ApiOkResponse({ description: 'Recommended treks' })
  async recommendations(
    @CurrentUser() user: AuthenticatedUser | null,
    @Query('limit') limit?: number,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
  ) {
    const userId = user?.id ?? null;
    const l = Number(limit ?? 10);
    const latitude = lat !== undefined ? Number(lat) : undefined;
    const longitude = lon !== undefined ? Number(lon) : undefined;
    return this.treksService.getRecommendations(userId, latitude, longitude, l);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trek details' })
  @ApiOkResponse({ description: 'Trek details' })
  async get(@Param('id') id: string) {
    return this.treksService.findOne(id);
  }
}
