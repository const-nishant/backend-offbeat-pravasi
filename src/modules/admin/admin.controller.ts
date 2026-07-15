import {
  Controller,
  Get,
  Query,
  Patch,
  Param,
  Body,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminRolesGuard } from 'src/common/guards/admin-roles.guard';
import { AdminRoles } from 'src/common/decorators/admin-roles.decorator';
import { AdminRole } from 'src/modules/users/enums/admin-role.enum';
import { AdminService } from './admin.service';
import { AdminUserFiltersDto } from './dtos/admin-user-filters.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { OrganizerRequestDecisionDto } from './dtos/organizer-request-decision.dto';
import { TrekDecisionDto } from './dtos/trek-decision.dto';
import { AuditLogQueryDto } from './dtos/audit-log-query.dto';
import { AuditLogService } from './audit-log.service';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';
import {
  AdminReferralQueryDto,
  AdminReferralCodeQueryDto,
} from '../referrals/dtos/admin-referral-query.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('platform-settings')
  @ApiOperation({ summary: 'Get platform settings' })
  async getPlatformSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Patch('platform-settings')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update platform settings' })
  async updatePlatformSettings(
    @Body() body: UpdatePlatformSettingsDto,
    @Req() req: any,
  ) {
    return this.adminService.updatePlatformSettings(body.settings, req.user);
  }

  @Post('bookings/:id/generate-ticket-pdf')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.FINANCE, AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Enqueue ticket PDF generation for a booking' })
  async generateBookingPdf(@Param('id') id: string, @Req() req: any) {
    return this.adminService.enqueueTicketPdfJob(id, req.user);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  async listUsers(@Query() q: AdminUserFiltersDto) {
    return this.adminService.listUsers(q, q.page, q.limit);
  }

  @Patch('users/:id/status')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT)
  @ApiOperation({ summary: 'Update user status' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserStatus(id, body, req.user, req);
  }

  @Get('organizer-requests')
  @ApiOperation({ summary: 'List organizer requests' })
  async listOrganizerRequests(@Query() q: AdminUserFiltersDto) {
    return this.adminService.listOrganizerRequests(q, q.page, q.limit);
  }

  @Patch('organizer-requests/:id')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Approve or reject an organizer request' })
  async decideOrganizerRequest(
    @Param('id') id: string,
    @Body() body: OrganizerRequestDecisionDto,
    @Req() req: any,
  ) {
    return this.adminService.decideOrganizerRequest(id, body, req.user, req);
  }

  @Get('treks/pending')
  @ApiOperation({ summary: 'List pending treks for approval' })
  async listPendingTreks(@Query() q: AdminUserFiltersDto) {
    return this.adminService.listPendingTreks(q, q.page, q.limit);
  }

  @Patch('treks/:id/decision')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Approve or reject a trek' })
  async decideTrek(
    @Param('id') id: string,
    @Body() body: TrekDecisionDto,
    @Req() req: any,
  ) {
    return this.adminService.decideTrek(id, body, req.user, req);
  }

  @Get('bookings/report')
  @ApiOperation({ summary: 'Get bookings report' })
  async bookingsReport(@Query() q: any) {
    return this.adminService.getBookingsReport(q, q.page, q.limit);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Query audit logs' })
  async auditLogs(@Query() q: AuditLogQueryDto) {
    return this.auditLogService.query(q, {
      page: q['page'],
      limit: q['limit'],
    });
  }

  @Get('referrals')
  @ApiOperation({ summary: 'List all referrals with filters' })
  async listReferrals(@Query() q: AdminReferralQueryDto) {
    return this.adminService.listReferrals(q, q.page, q.limit);
  }

  @Get('referrals/codes')
  @ApiOperation({ summary: 'List all referral codes with stats' })
  async listReferralCodes(@Query() q: AdminReferralCodeQueryDto) {
    return this.adminService.listReferralCodes(q, q.page, q.limit);
  }

  @Get('referrals/summary')
  @ApiOperation({ summary: 'Aggregate referral stats' })
  async getReferralSummary() {
    return this.adminService.getReferralSummary();
  }
}
