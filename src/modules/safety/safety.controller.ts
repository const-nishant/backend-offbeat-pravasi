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
import { SafetyService } from './safety.service';
import { UpsertSafetyInfoDto } from './dtos/upsert-safety-info.dto';
import { CreateEmergencyContactDto } from './dtos/create-emergency-contact.dto';
import { UpdateEmergencyContactDto } from './dtos/update-emergency-contact.dto';
import {
  CheckInDto,
  CheckOutDto,
  AcknowledgeSafetyDto,
} from './dtos/check-in.dto';
import { AuthGuard } from '@nestjs/passport';
import { OrganizerGuard } from '../../common/guards/organizer.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Safety')
@Controller()
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Public()
  @Get('treks/:trekId/safety')
  @ApiOperation({ summary: 'Get safety info for a trek' })
  @ApiOkResponse({ description: 'Safety information for the trek' })
  async getTrekSafety(@Param('trekId') trekId: string) {
    return this.safetyService.getTrekSafety(trekId);
  }

  @UseGuards(AuthGuard('jwt'), OrganizerGuard)
  @Put('treks/:trekId/safety')
  @ApiOperation({ summary: 'Upsert safety info for a trek' })
  @ApiOkResponse({ description: 'Safety info upserted' })
  async upsertTrekSafety(
    @Param('trekId') trekId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertSafetyInfoDto,
  ) {
    return this.safetyService.upsertTrekSafety(trekId, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile/emergency-contacts')
  @ApiOperation({ summary: 'List user emergency contacts' })
  @ApiOkResponse({ description: 'List of emergency contacts' })
  async getEmergencyContacts(@CurrentUser() user: AuthenticatedUser) {
    return this.safetyService.getUserContacts(user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile/emergency-contacts')
  @ApiOperation({ summary: 'Add emergency contact' })
  @ApiOkResponse({ description: 'Emergency contact created' })
  async addEmergencyContact(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    return this.safetyService.addContact(user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile/emergency-contacts/:id')
  @ApiOperation({ summary: 'Update emergency contact' })
  @ApiOkResponse({ description: 'Emergency contact updated' })
  async updateEmergencyContact(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    return this.safetyService.updateContact(id, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('profile/emergency-contacts/:id')
  @ApiOperation({ summary: 'Delete emergency contact' })
  @ApiOkResponse({ description: 'Emergency contact deleted' })
  async deleteEmergencyContact(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.safetyService.deleteContact(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('bookings/:bookingId/check-in')
  @ApiOperation({ summary: 'Check in to a trek' })
  @ApiOkResponse({ description: 'Check-in created' })
  async checkIn(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckInDto,
  ) {
    return this.safetyService.checkIn(bookingId, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('bookings/:bookingId/check-out')
  @ApiOperation({ summary: 'Check out from a trek' })
  @ApiOkResponse({ description: 'Check-out completed' })
  async checkOut(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckOutDto,
  ) {
    return this.safetyService.checkOut(bookingId, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('bookings/:bookingId/check-in-status')
  @ApiOperation({ summary: 'Get check-in/out status' })
  @ApiOkResponse({ description: 'Check-in status' })
  async getCheckInStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.safetyService.getCheckInStatus(bookingId, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('check-in/:checkInId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge safety and cancel escalation' })
  @ApiOkResponse({ description: 'Safety acknowledged' })
  async acknowledge(
    @Param('checkInId') checkInId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() _dto?: AcknowledgeSafetyDto,
  ) {
    return this.safetyService.acknowledge(checkInId, user.id);
  }
}
