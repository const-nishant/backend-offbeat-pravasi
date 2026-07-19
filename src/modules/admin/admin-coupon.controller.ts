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
import { AdminCouponService } from './admin-coupon.service';
import { DiscountType } from './entities/coupon.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';

class CreateCouponDto {
  @IsString()
  code!: string;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsInt()
  @Min(1)
  discountValue!: number;

  @IsOptional()
  @IsInt()
  maxDiscountCap?: number;

  @IsOptional()
  @IsInt()
  minBookingAmount?: number;

  @IsOptional()
  @IsInt()
  maxUses?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableTrekIds?: string[];

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

class UpdateCouponDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  discountValue?: number;

  @IsOptional()
  @IsInt()
  maxDiscountCap?: number | null;

  @IsOptional()
  @IsInt()
  minBookingAmount?: number;

  @IsOptional()
  @IsInt()
  maxUses?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableTrekIds?: string[];

  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Admin / Coupons')
@Controller('admin/coupons')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminCouponController {
  constructor(private readonly adminCouponService: AdminCouponService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'List all coupons' })
  async list() {
    return this.adminCouponService.list();
  }

  @Get(':id')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Get coupon by id' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCouponService.get(id);
  }

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create a new coupon' })
  async create(@Body() dto: CreateCouponDto) {
    return this.adminCouponService.create({
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validTo: dto.validTo ? new Date(dto.validTo) : undefined,
    });
  }

  @Patch(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update a coupon' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.adminCouponService.update(id, {
      ...dto,
      validFrom:
        dto.validFrom !== undefined
          ? dto.validFrom
            ? new Date(dto.validFrom)
            : null
          : undefined,
      validTo:
        dto.validTo !== undefined
          ? dto.validTo
            ? new Date(dto.validTo)
            : null
          : undefined,
    });
  }

  @Post(':id/expire')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Force-expire a coupon' })
  async expire(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCouponService.expire(id);
  }

  @Get(':id/redemptions')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({ summary: 'Get coupon redemption log' })
  async getRedemptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCouponService.getRedemptions(id);
  }
}
