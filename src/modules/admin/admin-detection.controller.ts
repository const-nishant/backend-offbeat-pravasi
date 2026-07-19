import { Controller, Get, Post, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminDetectionService } from './admin-detection.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Detection')
@Controller('admin/detection')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminDetectionController {
  constructor(private readonly adminDetectionService: AdminDetectionService) {}

  @Get('trek-duplicates')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({
    summary: 'Find potential trek duplicates by name similarity',
  })
  async trekDuplicates() {
    return this.adminDetectionService.trekDuplicates();
  }

  @Get('user-duplicates')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Find potential user duplicates by email/phone' })
  async userDuplicates() {
    return this.adminDetectionService.userDuplicates();
  }

  @Post('trek-duplicates/:id/resolve')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Mark a duplicate candidate as resolved' })
  async resolveTrekDuplicate(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminDetectionService.resolveTrekDuplicate(id);
  }
}
