import {
  Controller,
  Get,
  Query,
  Patch,
  Param,
  Body,
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

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) { }

  @Get('users')
  async listUsers(@Query() q: AdminUserFiltersDto) {
    // delegate to users module in implementation step
    return { message: 'TODO: list users', query: q };
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    // record action and delegate to users service
    await this.adminService.recordAction(
      req.user,
      'USER_STATUS_UPDATED',
      'user',
      id,
      body,
      req,
    );
    return { message: 'TODO: update user status', id, body };
  }

  @Get('organizer-requests')
  async listOrganizerRequests(@Query() q: AdminUserFiltersDto) {
    return { message: 'TODO: list organizer requests', query: q };
  }

  @Patch('organizer-requests/:id')
  async decideOrganizerRequest(
    @Param('id') id: string,
    @Body() body: OrganizerRequestDecisionDto,
    @Req() req: any,
  ) {
    await this.adminService.recordAction(
      req.user,
      'ORGANIZER_REQUEST_DECIDED',
      'organizer_request',
      id,
      body,
      req,
    );
    return { message: 'TODO: decide organizer request', id, body };
  }

  @Get('treks/pending')
  async listPendingTreks(@Query() q: AdminUserFiltersDto) {
    return { message: 'TODO: list pending treks', query: q };
  }

  @Patch('treks/:id/decision')
  async decideTrek(
    @Param('id') id: string,
    @Body() body: TrekDecisionDto,
    @Req() req: any,
  ) {
    await this.adminService.recordAction(
      req.user,
      'TREK_DECISION',
      'trek',
      id,
      body,
      req,
    );
    return { message: 'TODO: decide trek', id, body };
  }

  @Get('bookings/report')
  async bookingsReport(@Query() q: any) {
    return { message: 'TODO: bookings report', query: q };
  }

  @Get('audit-logs')
  async auditLogs(@Query() q: AuditLogQueryDto) {
    const res = await this.auditLogService.query(q, {
      page: q['page'],
      limit: q['limit'],
    });
    return res;
  }
}
