import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(AuthGuard('jwt'))
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post('treks/:trekId')
  @ApiOperation({ summary: 'Toggle bookmark on a trek' })
  @ApiOkResponse({ description: 'Bookmark toggled' })
  async toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trekId') trekId: string,
  ) {
    return this.bookmarksService.toggle(user.id, trekId);
  }

  @Get()
  @ApiOperation({ summary: 'List my bookmarked treks' })
  @ApiOkResponse({ description: 'Paginated bookmarks' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bookmarksService.findByUser(user.id, page, limit);
  }
}
