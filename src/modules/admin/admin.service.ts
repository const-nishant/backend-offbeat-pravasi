import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
