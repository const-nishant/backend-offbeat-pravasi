import { Controller, Get } from '@nestjs/common';
import { FriendshipsService } from './friendships.service';

@Controller('friendships')
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}

  @Get('status')
  getStatus(): { status: string } {
    return this.friendshipsService.getStatus();
  }
}
