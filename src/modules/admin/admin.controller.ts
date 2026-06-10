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
import { AdminService } from './admin.service';
import { AdminUserFiltersDto } from './dtos/admin-user-filters.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { OrganizerRequestDecisionDto } from './dtos/organizer-request-decision.dto';
import { TrekDecisionDto } from './dtos/trek-decision.dto';
import { AuditLogQueryDto } from './dtos/audit-log-query.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { AuditLogService } from './audit-log.service';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('platform-settings')
  async getPlatformSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Patch('platform-settings')
  async updatePlatformSettings(
    @Body() body: UpdatePlatformSettingsDto,
    @Req() req: any,
  ) {
    return this.adminService.updatePlatformSettings(body.settings, req.user);
  }

  @Post('bookings/:id/generate-ticket-pdf')
  async generateBookingPdf(@Param('id') id: string, @Req() req: any) {
    return this.adminService.enqueueTicketPdfJob(id, req.user);
  }

  @Get('users')
  async listUsers(@Query() q: AdminUserFiltersDto) {
    return this.adminService.listUsers(q, q.page, q.limit);
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserStatus(id, body, req.user, req);
  }

  @Get('organizer-requests')
  async listOrganizerRequests(@Query() q: AdminUserFiltersDto) {
    return this.adminService.listOrganizerRequests(q, q.page, q.limit);
  }

  @Patch('organizer-requests/:id')
  async decideOrganizerRequest(
    @Param('id') id: string,
    @Body() body: OrganizerRequestDecisionDto,
    @Req() req: any,
  ) {
    return this.adminService.decideOrganizerRequest(id, body, req.user, req);
  }

  @Get('treks/pending')
  async listPendingTreks(@Query() q: AdminUserFiltersDto) {
    return this.adminService.listPendingTreks(q, q.page, q.limit);
  }

  @Patch('treks/:id/decision')
  async decideTrek(
    @Param('id') id: string,
    @Body() body: TrekDecisionDto,
    @Req() req: any,
  ) {
    return this.adminService.decideTrek(id, body, req.user, req);
  }

  @Get('bookings/report')
  async bookingsReport(@Query() q: any) {
    return this.adminService.getBookingsReport(q, q.page, q.limit);
  }

  @Get('audit-logs')
  async auditLogs(@Query() q: AuditLogQueryDto) {
    return this.auditLogService.query(q, {
      page: q['page'],
      limit: q['limit'],
    });
  }
}
