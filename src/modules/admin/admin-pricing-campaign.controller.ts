import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminPricingCampaignService } from './admin-pricing-campaign.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  trekIds!: string[];

  @IsEnum(['PERCENTAGE', 'FLAT'])
  discountType!: string;

  @IsInt()
  discountValue!: number;

  @IsOptional()
  @IsInt()
  maxCap?: number;

  @IsOptional()
  @IsInt()
  minBookingAmount?: number;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trekIds?: string[];

  @IsOptional()
  @IsEnum(['PERCENTAGE', 'FLAT'])
  discountType?: string;

  @IsOptional()
  @IsInt()
  discountValue?: number;

  @IsOptional()
  @IsInt()
  maxCap?: number;

  @IsOptional()
  @IsInt()
  minBookingAmount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Admin / Pricing')
@Controller('admin/pricing')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminPricingCampaignController {
  constructor(
    private readonly adminPricingCampaignService: AdminPricingCampaignService,
  ) {}

  @Get('campaigns')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List pricing campaigns with status' })
  async list() {
    return this.adminPricingCampaignService.list();
  }

  @Post('campaigns')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a pricing campaign' })
  async create(@Body() dto: CreateCampaignDto) {
    return this.adminPricingCampaignService.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  @Patch('campaigns/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update or cancel a pricing campaign' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto) {
    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    return this.adminPricingCampaignService.update(id, updateData);
  }
}
