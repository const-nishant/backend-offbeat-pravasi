import { Injectable } from '@nestjs/common';

@Injectable()
export class TreksService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
