import type { DataSourceOptions } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Trek } from '../modules/treks/entities/trek.entity';
import { TrekImage } from '../modules/treks/entities/trek-image.entity';
import { TrekTag } from '../modules/treks/entities/trek-tag.entity';
import { TrekReview } from '../modules/treks/entities/trek-review.entity';
import { TrekInteraction } from '../modules/treks/entities/trek-interaction.entity';
import { FriendRequest } from '../modules/friendships/entities/friend-request.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { Payment } from '../modules/bookings/entities/payment.entity';
import { Post } from '../modules/posts/entities/post.entity';
import { Comment } from '../modules/posts/entities/comment.entity';
import { PostLike } from '../modules/posts/entities/post-like.entity';
import { Story } from '../modules/stories/entities/story.entity';
import { StoryView } from '../modules/stories/entities/story-view.entity';
import { OrganizerApplication } from '../modules/organizer/entities/organizer-application.entity';
import { AuditLog } from '../modules/admin/entities/audit-log.entity';
import { PlatformSettings } from '../modules/admin/entities/platform-settings.entity';
import { Media } from '../modules/media/entities/media.entity';
import { LeaderboardEntry } from '../modules/leaderboard/entities/leaderboard-entry.entity';
import { Report } from '../modules/reports/entities/report.entity';
import { DeviceToken } from '../modules/notifications/entities/device-token.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { ItineraryDay } from '../modules/itineraries/entities/itinerary-day.entity';
import { CancellationPolicy } from '../modules/policies/entities/cancellation-policy.entity';
import { CancellationTier } from '../modules/policies/entities/cancellation-tier.entity';
import { TrekPolicy } from '../modules/policies/entities/trek-policy.entity';
import { BookingPolicySnapshot } from '../modules/policies/entities/booking-policy-snapshot.entity';
import { GearItem } from '../modules/gear/entities/gear-item.entity';
import { TrekGearItem } from '../modules/gear/entities/trek-gear-item.entity';
import { UserPackingListItem } from '../modules/gear/entities/user-packing-list-item.entity';
import { TrekSafetyInfo } from '../modules/safety/entities/trek-safety-info.entity';
import { UserEmergencyContact } from '../modules/safety/entities/user-emergency-contact.entity';
import { TrekCheckIn } from '../modules/safety/entities/trek-check-in.entity';
import { FitnessAssessment } from '../modules/assessments/entities/fitness-assessment.entity';
import { TrekGroup } from '../modules/groups/entities/trek-group.entity';
import { GroupMember } from '../modules/groups/entities/group-member.entity';
import { ReferralCode } from '../modules/referrals/entities/referral-code.entity';
import { Referral } from '../modules/referrals/entities/referral.entity';
import { ReferralTierConfig } from '../modules/referrals/entities/referral-tier-config.entity';
import { WishlistCollection } from '../modules/wishlist/entities/wishlist-collection.entity';
import { WishlistItem } from '../modules/wishlist/entities/wishlist-item.entity';
import { UserRecommendationPreference } from '../modules/recommendations/entities/user-recommendation-preference.entity';
import { RecommendationResult } from '../modules/recommendations/entities/recommendation-result.entity';
import { RecommendationEvent } from '../modules/recommendations/entities/recommendation-event.entity';

export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'offbeat_pravasi',
  uuidExtension: 'pgcrypto',
  synchronize: process.env.TYPEORM_SYNC === 'true',

  entities: [
    User,
    Trek,
    TrekImage,
    TrekTag,
    TrekReview,
    TrekInteraction,
    FriendRequest,
    Booking,
    Payment,
    Post,
    Comment,
    PostLike,
    Story,
    StoryView,
    OrganizerApplication,
    AuditLog,
    PlatformSettings,
    Media,
    LeaderboardEntry,
    Report,
    DeviceToken,
    Notification,
    ItineraryDay,
    CancellationPolicy,
    CancellationTier,
    TrekPolicy,
    BookingPolicySnapshot,
    GearItem,
    TrekGearItem,
    UserPackingListItem,
    TrekSafetyInfo,
    UserEmergencyContact,
    TrekCheckIn,
    FitnessAssessment,
    TrekGroup,
    GroupMember,
    ReferralCode,
    Referral,
    ReferralTierConfig,
    WishlistCollection,
    WishlistItem,
    UserRecommendationPreference,
    RecommendationResult,
    RecommendationEvent,
  ],

  migrations: ['dist/database/migrations/*.js', 'src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',

  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,

  logging: process.env.DB_LOGGING === 'true',
};
