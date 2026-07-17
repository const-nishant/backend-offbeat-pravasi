import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dtos/create-policy.dto';
import { AssignPolicyDto } from './dtos/assign-policy.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';

@ApiTags('Policies')
@Controller()
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  @Get('admin/policies')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'List all cancellation policies' })
  async findAll() {
    return this.policiesService.findAll();
  }

  @Post('admin/policies')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Create a cancellation policy with tiers' })
  async create(@Body() dto: CreatePolicyDto) {
    return this.policiesService.create(dto);
  }

  @Patch('admin/policies/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Update a cancellation policy' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreatePolicyDto>) {
    return this.policiesService.update(id, dto);
  }

  @Delete('admin/policies/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Delete a cancellation policy' })
  async delete(@Param('id') id: string) {
    await this.policiesService.delete(id);
    return { deleted: true };
  }

  @Get('treks/:trekId/policy')
  @ApiOperation({ summary: 'Get cancellation policy for a trek' })
  async getForTrek(@Param('trekId') trekId: string) {
    return this.policiesService.getForTrek(trekId);
  }

  @Put('treks/:trekId/policy')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Assign cancellation policy to a trek' })
  async assignToTrek(
    @Param('trekId') trekId: string,
    @Body() dto: AssignPolicyDto,
  ) {
    await this.policiesService.assignToTrek(trekId, dto.policyId);
    return { assigned: true };
  }

  @Get('bookings/:bookingId/refund-estimate')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get real-time refund estimate for a booking' })
  async refundEstimate(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('Access denied');
    }
    const trekStartDate = (booking.trekSnapshot as any)?.startDate;
    if (!trekStartDate) {
      throw new NotFoundException(
        'Trek start date not found in booking snapshot',
      );
    }
    return this.policiesService.calculateRefund(
      bookingId,
      booking.totalAmountInr,
      new Date(trekStartDate),
    );
  }
}
