import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dtos/register-device.dto';
import { GetNotificationsDto } from './dtos/get-notifications.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('device-tokens')
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  async registerDeviceToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    const token = await this.notificationsService.registerDeviceToken(
      user.id,
      dto,
    );
    return { data: { id: token.id, platform: token.platform } };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('device-tokens/:token')
  @ApiOperation({ summary: 'Unregister a device token' })
  async unregisterDeviceToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
  ) {
    await this.notificationsService.unregisterDeviceToken(user.id, token);
    return { data: { message: 'Device token removed' } };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiOperation({ summary: 'Get paginated notification history' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: GetNotificationsDto,
  ) {
    return this.notificationsService.getNotifications(user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.markAsRead(user.id, id);
    return { data: { message: 'Marked as read' } };
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    await this.notificationsService.markAllAsRead(user.id);
    return { data: { message: 'All marked as read' } };
  }
}
