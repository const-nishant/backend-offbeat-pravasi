import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
