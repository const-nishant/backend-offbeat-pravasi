import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
