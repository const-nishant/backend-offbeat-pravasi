/**
 * Centralized Redis key definitions.
 * Keeps all cache/storage keys consistent and type-safe.
 */

export const CacheKeys = {
  // OTP storage
  otpEmail: (email: string): string => `otp:email:${email.toLowerCase()}`,

  // Refresh token rotation
  refreshSession: (userId: string, sessionId: string): string =>
    `refresh:${userId}:${sessionId}`,

  // Notification preference cache
  deviceToken: (userId: string): string => `device-token:${userId}`,

  // Leaderboard score caching
  leaderboardUser: (userId: string): string => `leaderboard:user:${userId}`,

  // Weather cache
  weatherTrek: (lat: number, lng: number, datesKey: string): string =>
    `weather:coord:${lat}:${lng}:${datesKey}`,

  // Analytics cache keys
  analyticsDau: (days: number): string => `analytics:dau:${days}`,
  analyticsTrekPopularity: (days: number, limit: number): string =>
    `analytics:trek-popularity:${days}:${limit}`,
  analyticsFunnel: (
    startDate?: string,
    endDate?: string,
    trekId?: string,
  ): string =>
    `analytics:funnel:${startDate ?? ''}:${endDate ?? ''}:${trekId ?? ''}`,
  analyticsRevenue: (period: string, days: number): string =>
    `analytics:revenue:${period}:${days}`,
  analyticsRetention: (months: number): string =>
    `analytics:retention:${months}`,
} as const;
