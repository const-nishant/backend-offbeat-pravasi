import { Controller } from '@nestjs/common';
import { FriendshipsService } from './friendships.service';

@Controller('friendships')
export class FriendshipsController {
  constructor(private readonly friendshipsService: FriendshipsService) {}
}
