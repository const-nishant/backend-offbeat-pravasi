import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminAssessmentService } from './admin-assessment.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Assessments')
@Controller('admin/assessments')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminAssessmentController {
  constructor(
    private readonly adminAssessmentService: AdminAssessmentService,
  ) {}

  @Get()
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List assessments with user details' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminAssessmentService.list(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get(':userId')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Assessment history for a user' })
  async history(@Param('userId') userId: string) {
    return this.adminAssessmentService.history(userId);
  }

  @Post(':userId/flag')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Flag user for re-assessment' })
  async flag(@Param('userId') userId: string) {
    return this.adminAssessmentService.flagForReassessment(userId);
  }
}
