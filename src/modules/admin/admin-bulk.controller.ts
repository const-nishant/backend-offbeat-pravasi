import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminBulkService } from './admin-bulk.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import type { Request } from 'express';

const MAX_BATCH = 500;

class BulkUserStatusDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH)
  userIds!: string[];

  @IsString()
  @IsIn(['suspend', 'activate'])
  action!: 'suspend' | 'activate';

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

class BulkTrekApproveDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH)
  trekIds!: string[];
}

class BulkTicketGenerateDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH)
  bookingIds!: string[];
}

@ApiTags('Admin / Bulk')
@Controller('admin/bulk')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminBulkController {
  constructor(private readonly adminBulkService: AdminBulkService) {}

  @Post('users/status')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Bulk suspend or activate users' })
  async updateUserStatus(@Body() dto: BulkUserStatusDto, @Req() req: Request) {
    const adminId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.adminBulkService.updateUserStatus(
      dto.userIds,
      dto.action,
      dto.reason,
      adminId,
    );
  }

  @Post('treks/approve')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Bulk approve treks' })
  async approveTreks(@Body() dto: BulkTrekApproveDto, @Req() req: Request) {
    const adminId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.adminBulkService.approveTreks(dto.trekIds, adminId);
  }

  @Post('bookings/generate-tickets')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Bulk generate ticket PDFs for bookings' })
  async generateTickets(
    @Body() dto: BulkTicketGenerateDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as any)?.sub ?? (req.user as any)?.id;
    return this.adminBulkService.generateTickets(dto.bookingIds, adminId);
  }
}
