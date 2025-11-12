import { Injectable } from '@nestjs/common';

@Injectable()
export class BookingsService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
