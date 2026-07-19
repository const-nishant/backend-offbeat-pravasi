import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminImpersonationService } from './admin-impersonation.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

import type { Request } from 'express';

class ImpersonateStartDto {
  @IsUUID()
  userId!: string;
  @IsString()
  @IsOptional()
  reason?: string;
}

@ApiTags('Admin / Impersonation')
@Controller('admin/impersonate')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminImpersonationController {
  constructor(
    private readonly adminImpersonationService: AdminImpersonationService,
  ) {}

  @Post()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Start impersonating a user' })
  async start(@Body() dto: ImpersonateStartDto, @Req() req: Request) {
    const adminId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.adminImpersonationService.start(
      dto.userId,
      adminId,
      dto.reason ?? 'No reason provided',
    );
  }

  @Post('stop')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Stop impersonation' })
  async stop(@Req() req: Request) {
    const adminId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.adminImpersonationService.stop(adminId);
  }
}
