import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { CommentPostDto } from './dtos/comment-post.dto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Posts')
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get feed posts from friends and self' })
  @ApiOkResponse({ description: 'Paginated feed posts' })
  async getFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.getFeed(user.id, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiOkResponse({ description: 'Post created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.create(user.id, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Toggle like on a post' })
  @ApiOkResponse({ description: 'Like toggled' })
  async toggleLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.postsService.toggleLike(user.id, id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Comment on a post' })
  @ApiOkResponse({ description: 'Comment added' })
  async addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CommentPostDto,
  ) {
    return this.postsService.addComment(user.id, id, dto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiOkResponse({ description: 'Paginated comments' })
  async getComments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.postsService.getComments(id, page, limit);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete own post' })
  @ApiOkResponse({ description: 'Post deleted' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.postsService.delete(user.id, id);
    return { message: 'Post deleted' };
  }
}
