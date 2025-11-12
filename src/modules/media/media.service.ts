import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
