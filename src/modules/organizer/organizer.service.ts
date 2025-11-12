import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizerService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
