import { Injectable } from '@nestjs/common';

@Injectable()
export class LeaderboardService {
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}
