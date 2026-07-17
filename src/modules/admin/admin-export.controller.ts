import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesGuard } from '../../common/guards/admin-roles.guard';
import { AdminRoles } from '../../common/decorators/admin-roles.decorator';
import { AdminRole } from '../../modules/users/enums/admin-role.enum';
import { AdminExportService } from './admin-export.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Admin / Export')
@Controller('admin/export')
@UseGuards(AuthGuard('jwt'), AdminRolesGuard)
export class AdminExportController {
  constructor(private readonly adminExportService: AdminExportService) {}

  @Get(':entity')
  @AdminRoles(AdminRole.SUPERADMIN, AdminRole.ANALYST)
  @ApiOperation({
    summary: 'Export data as CSV (entity: users, bookings, payments, treks)',
  })
  async export(@Param('entity') entity: string, @Res() res: Response) {
    const allowed = ['users', 'bookings', 'payments', 'treks'];
    if (!allowed.includes(entity)) {
      throw new HttpException(
        `Unknown entity: ${entity}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const { csv, filename } = await this.adminExportService.export(entity);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.csv"`,
    );
    res.send(csv);
  }
}
