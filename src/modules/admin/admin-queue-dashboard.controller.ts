import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminQueueDashboardService } from './admin-queue-dashboard.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Queue Dashboard')
@Controller('admin/queues')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
export class AdminQueueDashboardController {
  constructor(
    private readonly queueDashboardService: AdminQueueDashboardService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List all queues with job counts and pause state' })
  async listQueues() {
    return this.queueDashboardService.listQueues();
  }

  @Get(':name/jobs')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'List jobs in a queue filtered by status' })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed'],
  })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  async getJobs(
    @Param('name') name: string,
    @Query('status')
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.queueDashboardService.getJobs(
      name,
      status ?? 'failed',
      start ? Number(start) : 0,
      end ? Number(end) : 20,
    );
  }

  @Post(':name/jobs/:jobId/retry')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Retry a single failed job' })
  async retryJob(@Param('name') name: string, @Param('jobId') jobId: string) {
    return this.queueDashboardService.retryJob(name, jobId);
  }

  @Post(':name/retry-all')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Retry all failed jobs in a queue' })
  async retryAll(@Param('name') name: string) {
    return this.queueDashboardService.retryAll(name);
  }

  @Post(':name/clean')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Remove completed jobs older than N hours' })
  @ApiQuery({ name: 'hours', required: false })
  async clean(@Param('name') name: string, @Query('hours') hours?: string) {
    return this.queueDashboardService.clean(name, hours ? Number(hours) : 24);
  }

  @Post(':name/pause')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Pause a queue (stop processing new jobs)' })
  async pause(@Param('name') name: string) {
    return this.queueDashboardService.pause(name);
  }

  @Post(':name/resume')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Resume a paused queue' })
  async resume(@Param('name') name: string) {
    return this.queueDashboardService.resume(name);
  }
}
