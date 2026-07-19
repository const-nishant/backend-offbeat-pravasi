# Technical Specifications — Backend Offbeat Pravasi

> Use this document for deployment planning, resource sizing, cost calculations, and infrastructure decisions.

---

## 1. System Overview

| Property | Value |
|---|---|
| **Runtime** | Node.js >=22.22.1 |
| **Language** | TypeScript 5.7 |
| **Framework** | NestJS 11 |
| **Build output** | `dist/` (compiled JS) |
| **Port** | 4000 (configurable) |
| **Concurrency model** | Single-threaded async (Node.js event loop) |
| **Deployment unit** | Docker container |

---

## 2. Infrastructure Dependencies

| Service | Technology | Version | Purpose | Criticality |
|---|---|---|---|---|
| **Database** | PostgreSQL + PostGIS | 16+ | Primary data store | **High** |
| **Cache** | Redis | 7+ | Caching, BullMQ queues, OTP/session storage | **High** |
| **Object Storage** | Cloudflare R2 (S3-compatible) | — | Media files, PDF tickets | **High** |
| **Email** | SendGrid (primary) / SMTP (fallback) | — | Transactional emails | Medium |
| **Payments** | Stripe + Razorpay | — | Payment processing, webhooks | **High** |
| **Push Notifications** | Expo Push + Web Push (VAPID) | — | Mobile + browser notifications | Low |
| **Weather** | WeatherAPI.com | — | Trek weather forecasts | Low |

---

## 3. Database (PostgreSQL)

### 3.1 Connection

| Parameter | Default |
|---|---|
| **Host** | `DB_HOST` / `localhost` |
| **Port** | `DB_PORT` / `5432` |
| **Database** | `DB_NAME` / `offbeat_pravasi` |
| **SSL** | `DB_SSL` / `false` (uses `rejectUnauthorized: false`) |
| **Pool** | TypeORM default connection pool |
| **Extension** | `pgcrypto` (UUID gen), PostGIS (geospatial) |

### 3.2 Schema: 31 Tables

> **Total tables:** 31 (across 24 modules)

| # | Table Name | Module | Approx. Row Growth |
|---|---|---|---|
| 1 | `users` | Auth/Users | Linear with sign-ups |
| 2 | `treks` | Treks | Linear with treks created |
| 3 | `trek_images` | Treks | Multiple per trek |
| 4 | `trek_tags` | Treks | Tags per trek |
| 5 | `trek_reviews` | Treks | Per completed booking |
| 6 | `trek_interactions` | Treks | Per user view/like |
| 7 | `bookmarks` | Bookmarks | **DEPRECATED** → Use Wishlist |
| 8 | `friend_requests` | Friendships | **DEPRECATED** — no longer maintained |
| 9 | `bookings` | Bookings | Per booking |
| 10 | `payments` | Payments | Per payment attempt |
| 11 | `posts` | Posts | **DEPRECATED** — no longer maintained |
| 12 | `comments` | Posts | **DEPRECATED** — no longer maintained |
| 13 | `post_likes` | Posts | **DEPRECATED** — no longer maintained |
| 14 | `stories` | Stories | **DEPRECATED** — no longer maintained |
| 15 | `story_views` | Stories | **DEPRECATED** — no longer maintained |
| 16 | `organizer_applications` | Organizer | Per application |
| 17 | `audit_logs` | Admin | **High growth** — per admin action |
| 18 | `platform_settings` | Admin | Single row (key-value) |
| 19 | `media` | Media | Per upload |
| 20 | `leaderboard_entries` | Leaderboard | **DEPRECATED** — no longer maintained |
| 21 | `reports` | Reports | Per user report |
| 22 | `device_tokens` | Notifications | Per user device |
| 23 | `notifications` | Notifications | **High growth** — per notification sent |
| 24 | `itinerary_days` | Itineraries | Multiple per trek |
| 25 | `cancellation_policies` | Policies | ~3–5 rows total |
| 26 | `cancellation_tiers` | Policies | ~3–5 per policy |
| 27 | `trek_policies` | Policies | One per trek |
| 28 | `booking_policy_snapshots` | Policies | One per booking |
| 29 | `gear_items` | Gear | ~50–200 master items |
| 30 | `trek_gear_items` | Gear | Multiple per trek |
| 31 | `user_packing_list_items` | Gear | Multiple per user per trek |

### 3.3 High-Growth Tables

| Table | Growth Rate | Notes |
|---|---|---|
| `notifications` | **Very High** | Every push/email/SMS logged here |
| `audit_logs` | **High** | Every admin action logged |
| `bookings` | Medium | Scales with user base |
| `trek_interactions` | **High** | Every view/like/bookmark |
| `payments` | Medium | One per booking |

### 3.4 Estimated Storage

> Approximate row sizes (avg bytes):

| Table | Row Size | 10K users | 100K users |
|---|---|---|---|
| `users` | ~500 B | 5 MB | 50 MB |
| `treks` | ~1 KB | 5 MB (5K treks) | 50 MB |
| `bookings` | ~500 B | 10 MB | 100 MB |
| `payments` | ~500 B | 10 MB | 100 MB |
| `notifications` | ~300 B | 300 MB | 3 GB |
| `audit_logs` | ~500 B | 150 MB (30K admin actions) | 1.5 GB |
| `trek_interactions` | ~100 B | 100 MB | 1 GB |
| **Total (estimate)** | | **~600 MB** | **~5–6 GB** |

### 3.5 Migration Files (18)

| # | File | Dependencies |
|---|---|---|
| 1 | `0001-EnablePostgis.ts` | None |
| 2 | `0002-CreateTreksTables.ts` | None |
| 3 | `0003-CreateAuditLogsTable.ts` | None |
| 4 | `0004-AddIsSuspendedToUsers.ts` | Depends on `users` table |
| 5 | `0005-CreateBookingsPaymentsAndSettings.ts` | Depends on `users`, `treks` |
| 6 | `0006-AddCurrentParticipantsToTreks.ts` | Depends on `treks` |
| 7 | `0007-AddTrekStatusColumn.ts` | Depends on `treks` |
| 8 | `0008-AddPaymentMetadataColumn.ts` | Depends on `payments` |
| 9 | `0009-CreateBookmarksAndFriendRequests.ts` | Depends on `users` |
| 10 | `0010-CreatePostsStoriesTables.ts` | Depends on `users` |
| 11 | `0011-CreateOrganizerApplicationsTable.ts` | Depends on `users` |
| 12 | `0012-CreateMediaTable.ts` | Depends on `users` |
| 13 | `0013-CreateReportsTable.ts` | Depends on `users` |
| 14 | `0014-CreateLeaderboardEntriesTable.ts` | Depends on `users` |
| 15 | `0015-CreateDeviceTokensAndNotifications.ts` | Depends on `users` |
| 16 | `0016-CreateItineraryDaysTable.ts` | Depends on `treks` |
| 17 | `0017-CreateCancellationPolicies.ts` | Depends on `treks`, `bookings` |
| 18 | `0018-CreateGearTables.ts` | Depends on `treks` |

---

## 4. Redis

### 4.1 Connection

| Parameter | Default |
|---|---|
| **Host** | `REDIS_HOST` / `127.0.0.1` |
| **Port** | `REDIS_PORT` / `6379` |
| **Password** | `REDIS_PASSWORD` (optional) |
| **DB Index** | `REDIS_DB` / `0` |

### 4.2 Memory Usage Estimate

| Cache Key Pattern | Entries | TTL | Per Entry | Total (est.) |
|---|---|---|---|---|
| `otp:email:{email}` | Concurrent OTPs (~100) | 10 min | ~200 B | ~20 KB |
| `refresh:{userId}:{sessionId}` | Per active session (~10K) | 30 days | ~300 B | ~3 MB |
| `weather:coord:{lat}:{lng}` | Active treks (~500) | 30min–6h | ~2 KB | ~1 MB |
| `organizer:dashboard:{userId}` | Active organizers (~100) | 5 min | ~5 KB | ~500 KB |
| `user:recs:{userId}` | Active users (~5K) | 8 hours | ~1 KB | ~5 MB |
| `leaderboard:user:{userId}` | Active users (~10K) | 15 min | ~200 B | ~2 MB |
| BullMQ job data | Queue depth (~1K) | Until consumed | ~2 KB | ~2 MB |
| **Total estimate** | | | | **~15–20 MB** (steady state) |

> **Recommendation:** Allocate minimum **256 MB** Redis instance (allows for spikes, queue backlogs, and multiple DB indexes).

### 4.3 Redis Usage by Feature

| Feature | Redis Usage | Data Loss Impact |
|---|---|---|
| **OTP storage** | `set` with TTL | Low — user can request new OTP |
| **Refresh tokens** | Session management | **Medium** — all users must re-login |
| **BullMQ queues** | Job state + metadata | **High** — pending jobs lost, workers need manual rerun |
| **Weather cache** | `set` with TTL | Low — re-fetches from API |
| **Rate limiting** | Counters with TTL | Low — resets on next window |
| **Recommendations** | Cached results | Low — rebuilt on next cron |

---

## 5. BullMQ Queues & Workers

### 5.1 Queue Inventory

| Queue Name | Job Type | Schedule | Avg Duration | Concurrency | Priority |
|---|---|---|---|---|---|
| `notification-queue` | Event-driven | On demand | ~200ms | 5 | Medium |
| `story-expiry-queue` | Repeating | Every 60 min | ~500ms | 3 | Low |
| `booking-reminder-queue` | Repeating | Every 6 hours | ~2s (batch) | 3 | Low |
| `packing-reminder-queue` | Repeating | Every 6 hours | ~2s (batch) | 3 | Low |
| `weather-prefetch-queue` | Repeating | Every 3 hours | ~10s (batch) | 2 | Low |
| `recommendation-builder-queue` | Repeating | Every 1 hour | ~30s (batch) | 1 | Low |
| `cleanup-queue` | Repeating | On demand | ~1s | 1 | Low |
| `booking-release-queue` | Repeating | Every 60s | ~500ms | 2 | Medium |
| `ticket-pdf-queue` | Event-driven | On demand | ~1s | 3 | Medium |

### 5.2 Worker Resource Estimates

| Worker Name | CPU per job | Memory per job | Daily Jobs | Daily CPU (core-ms) |
|---|---|---|---|---|
| Notification worker | Low | ~10 MB | 10,000 | 2,000 |
| Story expiry | Low | ~5 MB | 24 | 12 |
| Booking reminder | Low | ~10 MB | 4 | 20 |
| Packing reminder | Low | ~10 MB | 4 | 20 |
| Weather prefetch | Medium | ~50 MB | 8 | 800 |
| Recommendation builder | **High** | ~200 MB | 24 | 7,200 |
| Cleanup | Low | ~5 MB | 24 | 12 |
| Booking release | Low | ~5 MB | 1,440 | 720 |
| Ticket PDF | Low | ~30 MB | 100 | 100 |

> **Total daily CPU estimate:** ~11,000 core-ms (low for a single core)
> **Peak memory (all workers concurrent):** ~300 MB

### 5.3 Worker Configuration

```typescript
// Default concurrency per queue
const WORKER_CONCURRENCY = {
  'notification-queue': 5,
  'story-expiry-queue': 3,
  'booking-reminder-queue': 3,
  'packing-reminder-queue': 3,
  'weather-prefetch-queue': 2,
  'recommendation-builder-queue': 1,
  'cleanup-queue': 1,
  'booking-release-queue': 2,
  'ticket-pdf-queue': 3,
};
```

---

## 6. Environment Variables

### 6.1 Count by Category

| Category | Count | Critical (required) |
|---|---|---|
| Server | 4 | 0 |
| Database | 8 | 5 |
| Redis | 4 | 2 |
| Auth/JWT | 8 | 4 |
| Google OAuth | 3 | 0 |
| Stripe | 3 | 3 |
| Razorpay | 3 | 3 |
| Cloudflare R2 | 7 | 6 |
| Email/SendGrid | 2 | 1 |
| Legacy SMTP | 5 | 0 |
| API Security | 2 | 1 |
| Weather | 5 | 1 |
| Push Notifications | 4 | 0 |
| Firebase | 1 | 0 |
| Workers | 1 | 0 |
| **Total** | **60** | **26** |

### 6.2 Secrets Requiring Rotation

| Secret | Rotation Frequency | Impact of Leak |
|---|---|---|
| `JWT_ACCESS_SECRET` | Quarterly | Token forgery — **critical** |
| `JWT_REFRESH_SECRET` | Quarterly | Token forgery — **critical** |
| `JWT_TICKET_SECRET` | Quarterly | Ticket forgery — **high** |
| `STRIPE_RESTRICTED_KEY` | On compromise | Payment fraud — **critical** |
| `STRIPE_WEBHOOK_SECRET` | On compromise | Webhook spoofing — **critical** |
| `RAZORPAY_KEY_SECRET` | On compromise | Payment fraud — **critical** |
| `RAZORPAY_WEBHOOK_SECRET` | On compromise | Webhook spoofing — **critical** |
| `R2_ACCESS_KEY_ID` | On compromise | Data access — **high** |
| `R2_SECRET_ACCESS_KEY` | On compromise | Data access — **high** |
| `SENDGRID_API_KEY` | On compromise | Email spoofing — **high** |
| `WEATHER_API_KEY` | Yearly | Service disruption — low |
| `ADMIN_PASSWORD_HASHES` | Quarterly | Admin account access — **critical** |
| `GLOBAL_API_KEY` | Quarterly | API access — **high** |

---

## 7. External API Rate Limits & Costs

| API | Free Tier | Paid Tier | Daily Budget (paid) | Circuit Breaker |
|---|---|---|---|---|
| **WeatherAPI.com** | 1M calls/month, 3 calls/sec | 5M calls/month | 1,000 calls/day | 3 consecutive failures → 1h open |
| **Stripe** | No fixed limit | Pay per transaction | N/A | N/A (idempotency keys) |
| **Razorpay** | No fixed limit | Pay per transaction | N/A | N/A (idempotency keys) |
| **SendGrid** | 100 emails/day | 100K emails/month | ~3,300/day | N/A |
| **Expo Push** | Unlimited | Unlimited | N/A | Batch + retry |
| **Cloudflare R2** | 10 GB storage, 1M ops/month | 0.015/GB/month | N/A | N/A |

---

## 8. Docker & Compute

### 8.1 Docker Image

| Stage | Base Image | Size (est.) |
|---|---|---|
| `base` | `node:22.22.1` | ~350 MB |
| `dev` | From `base` + `npm ci` | ~500 MB |
| `prod` | From `base` + `npm ci --omit=dev` + `dist` | ~400 MB |

### 8.2 Compute Sizing

| Tier | vCPU | RAM | Concurrent Users | Notes |
|---|---|---|---|---|
| **Dev/Staging** | 0.5 | 1 GB | <100 | Single container, SQLite for tests |
| **Small** | 1 | 2 GB | 1,000 | T3a.small / equivalent |
| **Medium** | 2 | 4 GB | 5,000 | T3a.medium / equivalent |
| **Large** | 4 | 8 GB | 20,000 | T3a.large / equivalent |

### 8.3 Horizontal Scaling Notes

- Workers can be scaled independently from the API server
- Recommendation builder worker is CPU-heavy (~200 MB, ~30s) — should run on a separate, lower-priority node
- Weather prefetch worker is I/O-bound (external API calls) — benefits from higher concurrency, not CPU
- Notifications worker is the highest-throughput worker — can be scaled horizontally with Redis as the coordination layer

---

## 9. Test Suite

### 9.1 Counts

| Test Type | Count |
|---|---|
| **Unit/Spec files** | 38 |
| **E2E files** | 7 |

### 9.2 Test Execution Time (estimated)

| Command | Duration | Notes |
|---|---|---|
| `npm test` (unit only) | ~30–60s | Parallel execution |
| `npm run test:e2e` | ~60–120s | Requires DB + Redis |
| `npm run test:cov` | ~45–90s | With coverage report |

---

## 10. Module Inventory

### 10.1 Current (24 modules)

| Module | Controllers | Services | Entities | Workers | Status |
|---|---|---|---|---|---|
| Auth | 1 | 1 | 1 | 0 | Active |
| Users | 1 | 1 | 1 | 0 | Active |
| Treks | 1 | 1 | 5 | 0 | Active |
| Posts | 1 | 1 | 3 | 0 | **DEPRECATED** |
| Stories | 1 | 1 | 2 | 1 | **DEPRECATED** |
| Bookmarks | 1 | 1 | 1 | 0 | **DEPRECATED** |
| Friendships | 1 | 1 | 1 | 0 | **DEPRECATED** |
| Organizer | 1 | 1 | 1 | 0 | Active |
| Admin | 1 | 3 | 2 | 0 | Active |
| Media | 1 | 1 | 1 | 0 | Active |
| Leaderboard | 1 | 1 | 1 | 0 | **DEPRECATED** |
| Notifications | 1 | 1 | 2 | 1 | Active |
| Bookings | 1 | 2 | 2 | 2 | Active |
| Payments | 1 | 1 | 0 | 0 | Active |
| Reports | 1 | 1 | 1 | 0 | Active |
| Itineraries | 1 | 1 | 1 | 0 | Active |
| Policies | 1 | 1 | 4 | 0 | Active |
| Gear | 1 | 1 | 3 | 1 | Active |
| Weather | 1 | 1 | 0 | 1 | Active |
| Jobs | 0 | 0 | 0 | 0 (orchestrator) | Active |
| Mailer | 0 | 2 | 0 | 0 | Active |
| Health | 1 | 1 | 0 | 0 | Active |
| Config | 0 | 0 | 0 | 0 | Active |
| **Total** | **21** | **27** | **31** | **6** | 5 deprecated |

### 10.2 Planned (7 modules — not yet implemented)

| Module | Controllers | Services | Entities | Workers |
|---|---|---|---|---|
| Safety | 1 | 1 | 3 | 2 |
| Assessments | 1 | 1 | 1 | 0 |
| Groups | 1 | 1 | 2 | 2 |
| Referrals | 1 | 1 | 3 | 1 |
| Wishlist | 1 | 1 | 2 | 0 |
| Recommendations | 1 | 1 | 3 | 1 |

---

## 11. Security Layer

### 11.1 Guards Applied

| Guard | Scope | Protection |
|---|---|---|
| `ApiKeyGuard` | Global (all routes) | Server-to-server request verification |
| `JwtAuthGuard` | Per-route | User authentication |
| `AdminGuard` | Per-route | Admin-only access |
| `OrganizerGuard` | Per-route | Organizer-only access |
| `@Public()` decorator | Per-route | Opt-out of ApiKeyGuard |

### 11.2 Rate Limiting

| Layer | Limit | Scope |
|---|---|---|
| Global | 100 requests / 90s per IP | All endpoints |

---

## 12. Storage (Cloudflare R2)

### 12.1 Buckets

| Bucket | Purpose | Public Access | Estimated Size (10K users) |
|---|---|---|---|
| `offbeat-profile` | User profile images | Yes (CDN) | ~500 MB |
| `offbeat-posts` | Post media attachments | Yes (CDN) | ~2 GB |
| `offbeat-treks` | Trek gallery images | Yes (CDN) | ~1 GB |

### 12.2 Upload Flow

1. Client requests presigned PUT URL → `POST /media/presign`
2. Backend generates presigned URL with expiry
3. Client uploads directly to R2
4. Media record created in `media` table

---

## 13. Logging & Observability

### 13.1 Log Format

```json
{
  "type": "request",
  "method": "GET",
  "url": "/api/v1/treks",
  "statusCode": 200,
  "durationMs": 45,
  "userId": "uuid",
  "query": { ... },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### 13.2 Compatible Tools

- ELK Stack (Elasticsearch + Logstash + Kibana)
- Loki + Grafana
- Datadog
- Sentry (error tracking)

---

## 14. Deployment Checklist

### Minimum Requirements

- [ ] PostgreSQL 16+ with PostGIS and pgcrypto extensions
- [ ] Redis 7+
- [ ] Node.js 22.22.1
- [ ] Cloudflare R2 account + 3 buckets created
- [ ] SendGrid (or SMTP) account
- [ ] Stripe account + API keys
- [ ] Razorpay account + API keys
- [ ] WeatherAPI.com API key
- [ ] Expo push access token
- [ ] VAPID keys for Web Push
- [ ] 60 environment variables configured (26 required)

### Recommended Deployment Order

1. Spin up PostgreSQL + Redis
2. Configure environment variables
3. Run migrations (18 files)
4. Start API server (smoke test health endpoint)
5. Start workers (if `WORKERS_ENABLED=true`)
6. Verify webhook endpoints (Stripe/Razorpay)
7. Verify email delivery (SendGrid/SMTP)
8. Verify push notifications (Expo/WebPush)
9. Monitor error rates for 24h
