import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpsertOnboardingDto } from './dtos/onboarding.dto';
import { SearchUsersDto } from './dtos/search-users.dto';
import type { RedisClient } from '../../common/utils/redis.client';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
  ) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getProfile(userId);

    if (dto.username) {
      const existing = await this.userRepository.findOne({
        where: { username: dto.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
      user.username = dto.username;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.dateOfBirth !== undefined)
      user.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.profileImageUrl !== undefined)
      user.profileImageUrl = dto.profileImageUrl;
    if (dto.bannerImageUrl !== undefined)
      user.bannerImageUrl = dto.bannerImageUrl;

    return this.userRepository.save(user);
  }

  async saveOnboarding(
    userId: string,
    dto: UpsertOnboardingDto,
  ): Promise<{ message: string }> {
    const user = await this.getProfile(userId);
    const key = `onboarding:${userId}`;
    await this.redis.set(
      key,
      JSON.stringify(dto.answers),
      'EX',
      30 * 24 * 3600,
    );
    return { message: 'Onboarding answers saved' };
  }

  async findById(userId: string): Promise<User> {
    return this.getProfile(userId);
  }

  async search(dto: SearchUsersDto) {
    const { skip, take, page, limit } = getPagination(dto);

    const where: any[] = [];
    if (dto.q) {
      where.push(
        { username: ILike(`%${dto.q}%`) },
        { fullName: ILike(`%${dto.q}%`) },
      );
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: where.length > 0 ? where : undefined,
      skip,
      take,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}
