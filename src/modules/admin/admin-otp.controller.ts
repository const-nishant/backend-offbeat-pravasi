import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminOtpService } from './admin-otp.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import type { Request } from 'express';

class GenerateOtpDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

@ApiTags('Admin / OTP')
@Controller('admin/otp')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminOtpController {
  constructor(private readonly adminOtpService: AdminOtpService) {}

  @Post('generate')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Generate a manual OTP for a user (5 min expiry)' })
  async generate(@Body() dto: GenerateOtpDto, @Req() req: Request) {
    const adminId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.adminOtpService.generate(
      dto.userId,
      adminId,
      dto.reason ?? 'Admin requested OTP',
    );
  }
}
