import { Injectable } from '@nestjs/common';

@Injectable()
export class FriendshipsService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
