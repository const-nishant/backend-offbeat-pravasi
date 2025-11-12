import { Injectable } from '@nestjs/common';

@Injectable()
export class StoriesService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
