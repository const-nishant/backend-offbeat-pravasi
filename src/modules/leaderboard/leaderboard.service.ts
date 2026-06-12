import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { FriendshipsService } from '../friendships/friendships.service';
import { RedisService } from '../../common/utils/redis.service';
import { CacheKeys } from '../../common/constants/cache.keys';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly friendshipsService: FriendshipsService,
    private readonly redisService: RedisService,
  ) {}

  async getFriendLeaderboard(userId: string) {
    const cacheKey = CacheKeys.leaderboardUser(userId) + ':friends';
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const friendIds = await this.friendshipsService.getFriendIds(userId);
    const visibleIds = [...new Set([userId, ...friendIds])];

    const users = await this.userRepo.find({
      where: { id: In(visibleIds) },
      select: [
        'id',
        'fullName',
        'username',
        'profileImageUrl',
        'userPoints',
        'userDistanceTravelled',
      ],
      order: { userPoints: 'DESC' },
    });

    const leaderboard = users.map((u, idx) => ({
      rank: idx + 1,
      userId: u.id,
      fullName: u.fullName,
      username: u.username,
      profileImageUrl: u.profileImageUrl,
      points: u.userPoints,
      distanceTravelled: u.userDistanceTravelled,
    }));

    await this.redisService.set(cacheKey, JSON.stringify(leaderboard), 900);

    return leaderboard;
  }

  async getGlobalLeaderboard(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAndCount({
      select: [
        'id',
        'fullName',
        'username',
        'profileImageUrl',
        'userPoints',
        'userDistanceTravelled',
      ],
      order: { userPoints: 'DESC' },
      skip,
      take: limit,
    });

    const data = users.map((u, idx) => ({
      rank: skip + idx + 1,
      userId: u.id,
      fullName: u.fullName,
      username: u.username,
      profileImageUrl: u.profileImageUrl,
      points: u.userPoints,
      distanceTravelled: u.userDistanceTravelled,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserRank(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'userPoints'],
    });
    if (!user) return null;

    const higherRanked = await this.userRepo.count({
      where: { userPoints: MoreThan(user.userPoints) },
    });

    const rank = higherRanked + 1;

    const totalUsers = await this.userRepo.count();

    return {
      userId: user.id,
      points: user.userPoints,
      rank,
      totalUsers,
    };
  }
}
