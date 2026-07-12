import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminSessionService } from './admin-session.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Sessions')
@Controller('admin/sessions')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminSessionController {
  constructor(private readonly adminSessionService: AdminSessionService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all active sessions' })
  async listSessions() {
    return this.adminSessionService.listSessions();
  }

  @Delete(':sessionId')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@Param('sessionId') sessionId: string) {
    return this.adminSessionService.revokeSession(sessionId);
  }

  @Delete('user/:userId')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Revoke all sessions for a user' })
  async revokeUserSessions(@Param('userId') userId: string) {
    return this.adminSessionService.revokeUserSessions(userId);
  }
}
