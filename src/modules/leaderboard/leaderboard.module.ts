import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardEntry } from './entities/leaderboard-entry.entity';
import { User } from '../users/entities/user.entity';
import { FriendshipsModule } from '../friendships/friendships.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderboardEntry, User]),
    forwardRef(() => FriendshipsModule),
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
