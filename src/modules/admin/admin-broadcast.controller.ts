import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminBroadcastService } from './admin-broadcast.service';
import { AdminBroadcastDto } from './dtos/admin-broadcast.dto';
import { AdminBroadcastHistoryQueryDto } from './dtos/admin-broadcast-history-query.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Admin / Notifications')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBroadcastController {
  constructor(private readonly adminBroadcastService: AdminBroadcastService) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Compose and send a broadcast push notification' })
  async broadcast(@Body() dto: AdminBroadcastDto, @Req() req: any) {
    return this.adminBroadcastService.broadcast(dto, req.user);
  }

  @Get('broadcast/history')
  @ApiOperation({ summary: 'Get broadcast campaign history' })
  async getHistory(@Query() q: AdminBroadcastHistoryQueryDto) {
    return this.adminBroadcastService.getCampaignHistory(q);
  }
}
