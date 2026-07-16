import type { DataSourceOptions } from 'typeorm';
import configuration from './configuration';
import { User } from '../modules/users/entities/user.entity';
import { Trek } from '../modules/treks/entities/trek.entity';
import { TrekImage } from '../modules/treks/entities/trek-image.entity';
import { TrekTag } from '../modules/treks/entities/trek-tag.entity';
import { TrekReview } from '../modules/treks/entities/trek-review.entity';
import { TrekInteraction } from '../modules/treks/entities/trek-interaction.entity';
import { FriendRequest } from '../modules/friendships/entities/friend-request.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { Payment } from '../modules/bookings/entities/payment.entity';
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
import { AnalyticsEvent } from '../modules/analytics/entities/analytics-event.entity';

// ponytail: defaults from configuration.ts (single source)
const { db } = configuration();

export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.user,
  password: db.password,
  database: db.name,
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
    AnalyticsEvent,
  ],

  migrations: ['dist/database/migrations/*.js', 'src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',

  ssl:
    process.env.DB_SSL === 'true'
      ? process.env.DB_CA_CERT
        ? { ca: process.env.DB_CA_CERT, rejectUnauthorized: true }
        : {
            rejectUnauthorized:
              process.env.NODE_ENV !== 'development' &&
              process.env.NODE_ENV !== 'test',
          }
      : undefined,

  extra: {
    max: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
    idleTimeoutMillis: parseInt(
      process.env.DB_POOL_IDLE_TIMEOUT ?? '30000',
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_POOL_CONNECT_TIMEOUT ?? '5000',
      10,
    ),
  },

  logging: process.env.DB_LOGGING === 'true',
};
