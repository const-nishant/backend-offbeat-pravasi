import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminReferralTierService } from './admin-referral-tier.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

class CreateTierDto {
  @IsString()
  tier!: string;

  @IsInt()
  @Min(0)
  minSuccessfulReferrals!: number;

  @IsInt()
  @Min(0)
  rewardPerReferralInr!: number;

  @IsInt()
  @Min(0)
  refereeDiscountInr!: number;
}

class UpdateTierDto {
  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSuccessfulReferrals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rewardPerReferralInr?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  refereeDiscountInr?: number;
}

class UpdateReferralSettingsDto {
  @IsOptional()
  @IsInt()
  pointsToInrRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minPayoutThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bonusForFirstReferral?: number;
}

@ApiTags('Admin / Referrals')
@Controller('admin/referral')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminReferralTierController {
  constructor(
    private readonly adminReferralTierService: AdminReferralTierService,
  ) {}

  @Get('tiers')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'List all referral tiers' })
  async listTiers() {
    return this.adminReferralTierService.listTiers();
  }

  @Post('tiers')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a referral tier' })
  async createTier(@Body() dto: CreateTierDto) {
    return this.adminReferralTierService.createTier(dto);
  }

  @Patch('tiers/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a referral tier' })
  async updateTier(@Param('id') id: string, @Body() dto: UpdateTierDto) {
    return this.adminReferralTierService.updateTier(id, dto);
  }

  @Delete('tiers/:id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Delete a referral tier' })
  async deleteTier(@Param('id') id: string) {
    return this.adminReferralTierService.deleteTier(id);
  }

  @Get('settings')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Get referral global settings' })
  async getSettings() {
    return this.adminReferralTierService.getSettings();
  }

  @Patch('settings')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update referral global settings' })
  async updateSettings(@Body() dto: UpdateReferralSettingsDto) {
    return this.adminReferralTierService.updateSettings(dto);
  }
}
