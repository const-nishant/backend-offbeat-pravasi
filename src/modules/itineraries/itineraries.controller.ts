import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ItinerariesService } from './itineraries.service';
import { CreateItineraryDayDto } from './dtos/create-itinerary-day.dto';
import { UpdateItineraryDayDto } from './dtos/update-itinerary-day.dto';
import { ReorderItineraryDto } from './dtos/reorder-itinerary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrganizerGuard } from '../../common/guards/organizer.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Itineraries')
@Controller('treks/:trekId/itinerary')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get full itinerary for a trek' })
  @ApiOkResponse({ description: 'Itinerary days ordered by day number' })
  async getByTrek(@Param('trekId') trekId: string) {
    return this.itinerariesService.getByTrek(trekId);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Put()
  @ApiOperation({ summary: 'Bulk set/reorder all itinerary days' })
  @ApiOkResponse({ description: 'Updated itinerary days' })
  async upsertDays(
    @Param('trekId') trekId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateItineraryDayDto[],
  ) {
    return this.itinerariesService.upsertDays(trekId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Post('days')
  @ApiOperation({ summary: 'Add a single itinerary day' })
  @ApiOkResponse({ description: 'Created itinerary day' })
  async addDay(
    @Param('trekId') trekId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateItineraryDayDto,
  ) {
    return this.itinerariesService.addDay(trekId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Patch('days/:dayId')
  @ApiOperation({ summary: 'Update a single itinerary day' })
  @ApiOkResponse({ description: 'Updated itinerary day' })
  async updateDay(
    @Param('dayId') dayId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateItineraryDayDto,
  ) {
    return this.itinerariesService.updateDay(dayId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Delete('days/:dayId')
  @ApiOperation({ summary: 'Remove an itinerary day' })
  @ApiOkResponse({ description: 'Day removed' })
  async deleteDay(
    @Param('dayId') dayId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itinerariesService.deleteDay(dayId, user.id);
  }

  @UseGuards(JwtAuthGuard, OrganizerGuard)
  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder itinerary days' })
  @ApiOkResponse({ description: 'Reordered itinerary days' })
  async reorder(
    @Param('trekId') trekId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderItineraryDto,
  ) {
    return this.itinerariesService.reorder(trekId, user.id, dto.dayIds);
  }
}
