import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
