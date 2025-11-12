import { Controller, Get } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get('status')
  getStatus(): { status: string } {
    return this.bookmarksService.getStatus();
  }
}
