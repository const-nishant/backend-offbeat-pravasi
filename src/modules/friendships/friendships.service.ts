import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendRequest } from './entities/friend-request.entity';
import { FriendRequestStatus } from './enums/friend-request-status.enum';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendshipsService {
  constructor(
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const receiver = await this.userRepo.findOne({
      where: { id: receiverId },
    });
    if (!receiver) throw new NotFoundException('User not found');

    const existing = await this.requestRepo.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId } },
        { sender: { id: receiverId }, receiver: { id: senderId } },
      ],
    });

    if (existing) {
      if (existing.status === FriendRequestStatus.PENDING) {
        throw new ConflictException('Friend request already pending');
      }
      if (existing.status === FriendRequestStatus.ACCEPTED) {
        throw new ConflictException('Already friends');
      }
      if (existing.status === FriendRequestStatus.DECLINED) {
        existing.status = FriendRequestStatus.PENDING;
        await this.requestRepo.save(existing);
        this.notificationsService.notifyFriendRequestReceived(
          receiverId,
          senderId,
        );
        return { id: existing.id, status: existing.status };
      }
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');

    const request = this.requestRepo.create({
      sender,
      receiver,
      status: FriendRequestStatus.PENDING,
    });
    const saved = await this.requestRepo.save(request);

    this.notificationsService.notifyFriendRequestReceived(receiverId, senderId);

    return { id: saved.id, status: saved.status };
  }

  async respondToRequest(
    requestId: string,
    userId: string,
    status: FriendRequestStatus.ACCEPTED | FriendRequestStatus.DECLINED,
  ) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    });
    if (!request) throw new NotFoundException('Friend request not found');

    if (request.receiver.id !== userId) {
      throw new ForbiddenException(
        'Only the receiver can respond to this request',
      );
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      throw new BadRequestException('Friend request is not pending');
    }

    request.status = status;
    const saved = await this.requestRepo.save(request);

    if (status === FriendRequestStatus.ACCEPTED) {
      this.notificationsService.notifyFriendRequestAccepted(
        request.sender.id,
        userId,
      );
    }

    return { id: saved.id, status: saved.status };
  }

  async getPendingRequests(userId: string) {
    return this.requestRepo.find({
      where: { receiver: { id: userId }, status: FriendRequestStatus.PENDING },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSentRequests(userId: string) {
    return this.requestRepo.find({
      where: { sender: { id: userId } },
      relations: ['receiver'],
      order: { createdAt: 'DESC' },
    });
  }

  async getFriends(userId: string) {
    const sent = await this.requestRepo.find({
      where: { sender: { id: userId }, status: FriendRequestStatus.ACCEPTED },
      relations: ['receiver'],
    });
    const received = await this.requestRepo.find({
      where: { receiver: { id: userId }, status: FriendRequestStatus.ACCEPTED },
      relations: ['sender'],
    });

    const friends = [
      ...sent.map((r) => r.receiver),
      ...received.map((r) => r.sender),
    ];

    const unique = friends.filter(
      (f, idx, self) => self.findIndex((u) => u.id === f.id) === idx,
    );

    return unique;
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const sent = await this.requestRepo.find({
      where: { sender: { id: userId }, status: FriendRequestStatus.ACCEPTED },
      relations: ['receiver'],
    });
    const received = await this.requestRepo.find({
      where: { receiver: { id: userId }, status: FriendRequestStatus.ACCEPTED },
      relations: ['sender'],
    });

    const ids = [
      ...sent.map((r) => r.receiver.id),
      ...received.map((r) => r.sender.id),
    ];

    return [...new Set(ids)];
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const count = await this.requestRepo.count({
      where: [
        {
          sender: { id: userId1 },
          receiver: { id: userId2 },
          status: FriendRequestStatus.ACCEPTED,
        },
        {
          sender: { id: userId2 },
          receiver: { id: userId1 },
          status: FriendRequestStatus.ACCEPTED,
        },
      ],
    });
    return count > 0;
  }

  async removeFriend(userId: string, friendId: string) {
    const request = await this.requestRepo.findOne({
      where: [
        {
          sender: { id: userId },
          receiver: { id: friendId },
          status: FriendRequestStatus.ACCEPTED,
        },
        {
          sender: { id: friendId },
          receiver: { id: userId },
          status: FriendRequestStatus.ACCEPTED,
        },
      ],
    });

    if (!request) throw new NotFoundException('Friendship not found');

    request.status = FriendRequestStatus.DECLINED;
    await this.requestRepo.save(request);
    return { message: 'Friend removed' };
  }
}
