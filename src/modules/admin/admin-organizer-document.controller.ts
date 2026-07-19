import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminOrganizerDocumentService } from './admin-organizer-document.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';

class RejectDto {
  @IsString()
  reason!: string;
}

@ApiTags('Admin / Organizer Documents')
@Controller('admin/organizers')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminOrganizerDocumentController {
  constructor(
    private readonly adminOrganizerDocumentService: AdminOrganizerDocumentService,
  ) {}

  @Get('documents/expiring')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'Documents expiring within 30/60/90 days' })
  async getExpiring() {
    return this.adminOrganizerDocumentService.getExpiring();
  }

  @Get(':id/documents')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.MODERATOR)
  @ApiOperation({ summary: 'List documents for an organizer' })
  async listDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminOrganizerDocumentService.listDocuments(id);
  }

  @Post(':id/documents/:docId/approve')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Approve a document' })
  async approve(@Param('docId', ParseUUIDPipe) docId: string) {
    return this.adminOrganizerDocumentService.approve(
      docId,
      '00000000-0000-0000-0000-000000000000',
    );
  }

  @Post(':id/documents/:docId/reject')
  @AdminRoles(AdminRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reject a document with reason' })
  async reject(@Param('docId', ParseUUIDPipe) docId: string, @Body() dto: RejectDto) {
    return this.adminOrganizerDocumentService.reject(docId, dto.reason);
  }
}
