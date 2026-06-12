import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  /**
   * TODO: Implement push notification for friend request received.
   * Called when a user sends a friend request to another user.
   * Should send FCM push to the receiver's device tokens.
   */
  notifyFriendRequestReceived(receiverId: string, senderId: string): void {
    // TODO: lookup receiver's device tokens, send FCM push
  }

  /**
   * TODO: Implement push notification for friend request accepted.
   * Called when a user accepts a friend request.
   * Should send FCM push to the original sender's device tokens.
   */
  notifyFriendRequestAccepted(senderId: string, acceptorId: string): void {
    // TODO: lookup sender's device tokens, send FCM push
  }

  /**
   * TODO: Implement push notification for booking confirmed.
   * Called when a booking payment succeeds.
   */
  notifyBookingConfirmed(userId: string, bookingId: string): void {
    // TODO: send booking confirmation push + email
  }

  /**
   * TODO: Implement push notification for trek reminder.
   * Called X days/hours before a trek start date.
   */
  notifyTrekReminder(userId: string, trekId: string): void {
    // TODO: send trek reminder push
  }
}
