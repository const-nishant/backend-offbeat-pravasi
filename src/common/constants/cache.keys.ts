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

  // User cache (optional future usage)
  userProfile: (userId: string): string => `user:profile:${userId}`,

  // Story expiration keys
  story: (storyId: string): string => `story:${storyId}`,

  // Rate limiting keys (future-proof)
  rateLimit: (userId: string, endpoint: string): string =>
    `ratelimit:${userId}:${endpoint}`,

  // Notification preference cache
  deviceToken: (userId: string): string => `device-token:${userId}`,

  // Leaderboard score caching (future)
  leaderboardUser: (userId: string): string => `leaderboard:user:${userId}`,

  // Weather cache
  weatherTrek: (lat: number, lng: number, datesKey: string): string =>
    `weather:coord:${lat}:${lng}:${datesKey}`,
} as const;
