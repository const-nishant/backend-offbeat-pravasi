import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
