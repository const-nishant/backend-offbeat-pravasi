import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { GearService } from './gear.service';
import { CreateGearItemDto } from './dtos/create-gear-item.dto';
import { SetTrekGearDto } from './dtos/set-trek-gear.dto';
import { UpdatePackingItemDto } from './dtos/update-packing-item.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Gear')
@Controller()
export class GearController {
  constructor(private readonly gearService: GearService) {}

  @Get('gear-items')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'List all master gear items' })
  async getAllGearItems() {
    return this.gearService.getAllGearItems();
  }

  @Post('gear-items')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Create a master gear item' })
  async createGearItem(@Body() dto: CreateGearItemDto) {
    return this.gearService.createGearItem(dto);
  }

  @Put('gear-items/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Update a master gear item' })
  async updateGearItem(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGearItemDto>,
  ) {
    return this.gearService.updateGearItem(id, dto);
  }

  @Get('treks/:trekId/gear')
  @ApiOperation({ summary: 'Get gear list for a trek' })
  async getTrekGear(@Param('trekId') trekId: string) {
    return this.gearService.getTrekGear(trekId);
  }

  @Put('treks/:trekId/gear')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set gear list for a trek (organizer only)' })
  async setTrekGear(
    @Param('trekId') trekId: string,
    @Body() dto: SetTrekGearDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gearService.setTrekGear(trekId, user.id, dto);
  }

  @Get('bookings/:bookingId/packing-list')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get user packing list for a booking' })
  async getPackingList(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gearService.getPackingList(bookingId, user.id);
  }

  @Patch('bookings/:bookingId/packing-list/items/:itemId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Toggle packing list item fields' })
  async updatePackingItem(
    @Param('bookingId') bookingId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePackingItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gearService.updatePackingItem(bookingId, itemId, user.id, dto);
  }

  @Post('rentals/:bookingId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Confirm rental items for a booking' })
  async confirmRentals(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.gearService.confirmRentals(bookingId, user.id);
  }
}
