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
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { CreateCollectionDto } from './dtos/create-collection.dto';
import { UpdateCollectionDto } from './dtos/update-collection.dto';
import { AddToCollectionDto } from './dtos/add-to-collection.dto';
import { UpdateItemDto } from './dtos/update-item.dto';
import {
  WishlistCollectionResponseDto,
  WishlistItemResponseDto,
} from './dtos/wishlist-collection-response.dto';

@ApiTags('Wishlist')
@UseGuards(JwtAuthGuard)
@Controller()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('wishlist/collections')
  @ApiOperation({ summary: 'List user wishlist collections' })
  @ApiOkResponse({ type: [WishlistCollectionResponseDto] })
  async getCollections(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WishlistCollectionResponseDto[]> {
    return this.wishlistService.getCollections(user.id);
  }

  @Post('wishlist/collections')
  @ApiOperation({ summary: 'Create a wishlist collection' })
  @ApiOkResponse({ type: WishlistCollectionResponseDto })
  async createCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCollectionDto,
  ): Promise<WishlistCollectionResponseDto> {
    return this.wishlistService.createCollection(user.id, dto);
  }

  @Patch('wishlist/collections/:id')
  @ApiOperation({ summary: 'Update a wishlist collection' })
  @ApiOkResponse({ type: WishlistCollectionResponseDto })
  async updateCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<WishlistCollectionResponseDto> {
    return this.wishlistService.updateCollection(id, user.id, dto);
  }

  @Delete('wishlist/collections/:id')
  @ApiOperation({ summary: 'Delete a wishlist collection and its items' })
  async deleteCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.wishlistService.deleteCollection(id, user.id);
  }

  @Get('wishlist/collections/:id/items')
  @ApiOperation({ summary: 'List items in a collection' })
  @ApiOkResponse({ type: [WishlistItemResponseDto] })
  async getItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WishlistItemResponseDto[]> {
    return this.wishlistService.getItems(id, user.id);
  }

  @Post('wishlist/collections/:id/items')
  @ApiOperation({ summary: 'Add trek to a collection' })
  @ApiOkResponse({ type: WishlistItemResponseDto })
  async addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddToCollectionDto,
  ): Promise<WishlistItemResponseDto> {
    return this.wishlistService.addItem(id, user.id, dto);
  }

  @Patch('wishlist/items/:id')
  @ApiOperation({ summary: 'Update wishlist item notes/priority' })
  @ApiOkResponse({ type: WishlistItemResponseDto })
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ): Promise<WishlistItemResponseDto> {
    return this.wishlistService.updateItem(id, user.id, dto);
  }

  @Delete('wishlist/items/:id')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  async removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.wishlistService.removeItem(id, user.id);
  }

  @Post('wishlist/quick-add/:trekId')
  @ApiOperation({ summary: 'Quick-add trek to default collection' })
  @ApiOkResponse({ type: WishlistItemResponseDto })
  async quickAdd(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trekId') trekId: string,
  ): Promise<WishlistItemResponseDto> {
    return this.wishlistService.quickAdd(trekId, user.id);
  }

  @Post('wishlist/collections/:id/share')
  @ApiOperation({ summary: 'Generate share token for a collection' })
  async shareCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ shareToken: string }> {
    const token = await this.wishlistService.generateShareToken(id, user.id);
    return { shareToken: token };
  }

  @Get('wishlist/shared/:token')
  @ApiOperation({ summary: 'View a shared wishlist collection' })
  @ApiOkResponse({ type: WishlistCollectionResponseDto })
  async getSharedCollection(
    @Param('token') token: string,
  ): Promise<WishlistCollectionResponseDto> {
    return this.wishlistService.getSharedCollection(token);
  }

  @Post('wishlist/treks/:trekId/toggle')
  @ApiOperation({
    summary: 'Toggle trek save — add to or remove from wishlist',
  })
  async toggleSave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trekId') trekId: string,
  ): Promise<{ saved: boolean }> {
    return this.wishlistService.toggleSave(trekId, user.id);
  }

  @Get('wishlist/treks/:trekId/status')
  @ApiOperation({ summary: 'Check if trek is saved and in which collections' })
  async getTrekStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trekId') trekId: string,
  ): Promise<{ saved: boolean; collectionIds: string[] }> {
    return this.wishlistService.getTrekStatus(trekId, user.id);
  }

  @Get('wishlist/items')
  @ApiOperation({ summary: 'Flat paginated list of all saved treks' })
  async getAllItems(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: WishlistItemResponseDto[]; meta: any }> {
    return this.wishlistService.getAllItems(user.id, page, limit);
  }
}
