import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from './entities/notification.entity';
import { RegisterDeviceDto } from './dtos/register-device.dto';
import { GetNotificationsDto } from './dtos/get-notifications.dto';
import { NotificationType } from './enums/notification-type.enum';
import { User } from '../users/entities/user.entity';
import { Queue } from 'bullmq';
import { bullConnection } from '../../jobs/config';
import {
  getPagination,
  buildPaginationMeta,
} from '../../common/pagination/pagination.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notificationQueue = new Queue('notification-queue', {
    connection: bullConnection,
  });

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async registerDeviceToken(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceToken> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let token = await this.deviceTokenRepo.findOne({
      where: { token: dto.token, platform: dto.platform },
      relations: ['user'],
    });

    if (token) {
      token.lastSeenAt = new Date();
      if (dto.appVersion) token.appVersion = dto.appVersion;
      if (token.user.id !== userId) {
        token.user = user;
      }
    } else {
      token = this.deviceTokenRepo.create({
        user,
        token: dto.token,
        platform: dto.platform,
        appVersion: dto.appVersion,
        lastSeenAt: new Date(),
      });
    }

    return this.deviceTokenRepo.save(token);
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    const device = await this.deviceTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });
    if (device && device.user.id === userId) {
      await this.deviceTokenRepo.remove(device);
    }
  }

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const tokens = await this.deviceTokenRepo.find({
      where: { user: { id: userId } },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No device tokens found for user ${userId}`);
      return;
    }

    const notification = this.notificationRepo.create({
      user: { id: userId } as User,
      type,
      title,
      body,
      data: data ?? null,
    });
    await this.notificationRepo.save(notification);

    for (const device of tokens) {
      await this.notificationQueue.add(
        'send-push',
        {
          deviceToken: device.token,
          platform: device.platform,
          title,
          body,
          data: data ?? null,
          notificationId: notification.id,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    }
  }

  async sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.all(
      userIds.map((uid) => this.sendPushToUser(uid, title, body, type, data)),
    );
  }

  async getNotifications(userId: string, dto: GetNotificationsDto) {
    const { skip, take, page, limit } = getPagination(dto);

    const [items, total] = await this.notificationRepo.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { user: { id: userId }, readAt: null as any },
    });

    return {
      data: items,
      meta: buildPaginationMeta(page, limit, total),
      unreadCount,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationRepo.update(
      { id: notificationId, user: { id: userId }, readAt: null as any },
      { readAt: new Date() },
    );
    if (result.affected === 0) {
      throw new NotFoundException('Notification not found or already read');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { user: { id: userId }, readAt: null as any },
      { readAt: new Date() },
    );
  }

  async notifyFriendRequestReceived(
    receiverId: string,
    senderId: string,
  ): Promise<void> {
    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    const senderName = sender?.fullName ?? sender?.username ?? 'Someone';
    await this.sendPushToUser(
      receiverId,
      'New Friend Request',
      `${senderName} sent you a friend request`,
      NotificationType.FRIEND_REQUEST_RECEIVED,
      { senderId },
    );
  }

  async notifyFriendRequestAccepted(
    senderId: string,
    acceptorId: string,
  ): Promise<void> {
    const acceptor = await this.userRepo.findOne({
      where: { id: acceptorId },
    });
    const acceptorName = acceptor?.fullName ?? acceptor?.username ?? 'Someone';
    await this.sendPushToUser(
      senderId,
      'Friend Request Accepted',
      `${acceptorName} accepted your friend request`,
      NotificationType.FRIEND_REQUEST_ACCEPTED,
      { acceptorId },
    );
  }

  async notifyBookingConfirmed(
    userId: string,
    bookingId: string,
  ): Promise<void> {
    await this.sendPushToUser(
      userId,
      'Booking Confirmed',
      'Your trek booking has been confirmed! Check your email for the ticket.',
      NotificationType.BOOKING_CONFIRMED,
      { bookingId },
    );
  }

  async notifyBookingCancelled(
    userId: string,
    bookingId: string,
    trekName: string,
  ): Promise<void> {
    await this.sendPushToUser(
      userId,
      'Booking Cancelled',
      `Your booking for ${trekName} has been cancelled.`,
      NotificationType.BOOKING_CANCELLED,
      { bookingId },
    );
  }

  async notifyTrekReminder(
    userId: string,
    trekId: string,
    trekName: string,
  ): Promise<void> {
    await this.sendPushToUser(
      userId,
      'Trek Reminder',
      `Your trek "${trekName}" is coming up soon! Get ready!`,
      NotificationType.BOOKING_REMINDER,
      { trekId },
    );
  }

  async notifyOrganizerApproved(
    userId: string,
    organizationName: string,
  ): Promise<void> {
    await this.sendPushToUser(
      userId,
      'Organizer Application Approved',
      `Congratulations! Your application for "${organizationName}" has been approved. You can now create and manage treks.`,
      NotificationType.ORGANIZER_APPROVED,
      { organizationName },
    );
  }

  async notifyOrganizerRejected(
    userId: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    const body = reason
      ? `Your application for "${organizationName}" was not approved. Reason: ${reason}`
      : `Your application for "${organizationName}" was not approved at this time.`;
    await this.sendPushToUser(
      userId,
      'Organizer Application Update',
      body,
      NotificationType.ORGANIZER_REJECTED,
      { organizationName, reason },
    );
  }

  async notifyPostLiked(
    postOwnerId: string,
    postId: string,
    likerName: string,
  ): Promise<void> {
    await this.sendPushToUser(
      postOwnerId,
      'New Like',
      `${likerName} liked your post`,
      NotificationType.NEW_LIKE,
      { postId },
    );
  }

  async notifyPostCommented(
    postOwnerId: string,
    postId: string,
    commenterName: string,
    comment: string,
  ): Promise<void> {
    const snippet =
      comment.length > 80 ? `${comment.slice(0, 80)}...` : comment;
    await this.sendPushToUser(
      postOwnerId,
      'New Comment',
      `${commenterName} commented: "${snippet}"`,
      NotificationType.NEW_COMMENT,
      { postId },
    );
  }

  async notifyNewBookingToOrganizer(
    organizerId: string,
    trekName: string,
    bookingId: string,
    quantity: number,
  ): Promise<void> {
    await this.sendPushToUser(
      organizerId,
      'New Booking Received',
      `You received a new booking for "${trekName}" (${quantity} participant${quantity > 1 ? 's' : ''})`,
      NotificationType.BOOKING_CONFIRMED,
      { bookingId, trekName },
    );
  }

  async notifyStoryPosted(
    friendIds: string[],
    creatorName: string,
    storyId: string,
  ): Promise<void> {
    await this.sendPushToUsers(
      friendIds,
      'New Story',
      `${creatorName} posted a new story`,
      NotificationType.NEW_FOLLOWER,
      { storyId },
    );
  }

  async notifyWishlistPriceDrop(
    userId: string,
    trekName: string,
    trekId: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    const savings = oldPrice - newPrice;
    await this.sendPushToUser(
      userId,
      '💰 Price Drop Alert!',
      `"${trekName}" dropped from ₹${oldPrice} to ₹${newPrice} — save ₹${savings}!`,
      NotificationType.WISHLIST_PRICE_DROP,
      { trekId, oldPrice, newPrice },
    );
  }

  async notifyStoryViewed(
    storyOwnerId: string,
    viewerName: string,
    storyId: string,
  ): Promise<void> {
    await this.sendPushToUser(
      storyOwnerId,
      'Story Viewed',
      `${viewerName} viewed your story`,
      NotificationType.NEW_FOLLOWER,
      { storyId },
    );
  }
}
