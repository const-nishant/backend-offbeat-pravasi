import { Injectable } from '@nestjs/common';

@Injectable()
export class BookmarksService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
