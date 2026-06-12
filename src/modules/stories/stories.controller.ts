import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dtos/create-story.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Stories')
@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active stories from friends and self' })
  @ApiOkResponse({ description: 'List of active stories' })
  async getActiveStories(@CurrentUser() user: AuthenticatedUser) {
    return this.storiesService.findActiveByFriends(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new story (24h expiry)' })
  @ApiOkResponse({ description: 'Story created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStoryDto,
  ) {
    return this.storiesService.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete own story' })
  @ApiOkResponse({ description: 'Story deleted' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.storiesService.delete(user.id, id);
    return { message: 'Story deleted' };
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark story as viewed' })
  @ApiOkResponse({ description: 'View tracked' })
  async markAsViewed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.storiesService.markAsViewed(id, user.id);
  }
}
