import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminWebhookService } from './admin-webhook.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Webhook Logs')
@Controller('admin/webhooks')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminWebhookController {
  constructor(private readonly adminWebhookService: AdminWebhookService) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List recent webhook events' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'status', required: false })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
  ) {
    return this.adminWebhookService.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      provider,
      status,
    );
  }

  @Get(':id')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get full webhook event detail' })
  async getById(@Param('id') id: string) {
    return this.adminWebhookService.getById(id);
  }

  @Post(':id/retry')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Replay a webhook event' })
  async retry(@Param('id') id: string) {
    return this.adminWebhookService.retry(id);
  }
}
