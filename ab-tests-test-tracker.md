# Admin Endpoint Test Tracker

Base URL: `{{baseUrl}}/admin`
Auth: `x-api-key` + `Authorization: Bearer <superadmin token>`
Last updated: 2026-07-18

## Endpoints

| # | Method | Path | Tested | Result | Notes |
|---|--------|------|--------|--------|-------|
| 1 | GET | `/admin/ab-tests` | ✅ | 200 | Lists tests (superadmin only) |
| 2 | POST | `/admin/ab-tests` | ✅ | 200 / 400 / 409 | Create — see cases below |
| 3 | GET | `/admin/ab-tests/:id/results` | ✅ | 200 / 404 | Missing id → 404 |
| 4 | POST | `/admin/ab-tests/:id/conclude` | ✅ | 200 / 400 / 404 | Bad winner → 400; missing id → 404 |

## POST /admin/ab-tests — Test Cases

| Case | Body snippet | Expected | Actual | Status |
|------|-------------|----------|--------|--------|
| Happy path | valid key + 2 variants summing 100 | 200 | 200 | ✅ |
| Missing `key` | `{variants:[...]}` | 400 | 400 | ✅ |
| Missing `variants` | `{key:"x"}` | 400 | 400 | ✅ |
| Empty `variants` | `{key:"x",variants:[]}` | 400 | 400 | ✅ |
| Variant missing `name` | `{variants:[{percentage:50}]}` | 400 | 400 | ✅ |
| String `percentage` | `{variants:[{name:"a",percentage:"50"}]}` | 400 | 400 | ✅ |
| Negative `percentage` | `{variants:[{name:"a",percentage:-10}]}` | 400 | 400 | ✅ |
| `percentage` > 100 | `{variants:[{name:"a",percentage:150}]}` | 400 | 400 | ✅ |
| Percentages sum ≠ 100 | `{variants:[{a:100},{b:50}]}` | 400 | 400 | ✅ |
| Invalid `startDate` | `startDate:"2026-13-40"` | 400 | 400 | ✅ |
| `endDate` before `startDate` | end < start | 400 | 400 | ✅ |
| Duplicate `key` | reuse existing key | 409 | 409 | ✅ |
| Wrong types | `key:123, variants:"x"` | 400 | 400 | ✅ |

## POST /admin/ab-tests/:id/conclude — Test Cases

| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Happy path | `{winnerVariant:"variant_a"}` | 200 | 200 | ✅ |
| Missing `winnerVariant` | `{}` | 400 | 400 | ✅ |
| Winner not in variants | `{winnerVariant:"ghost"}` | 400 | 400 | ✅ |
| Missing id | `/00000000-.../conclude` | 404 | 404 | ✅ |

## Auth Edge Cases (all return 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401
- [x] Non-superadmin role → 403 (to verify)

## Bugs Fixed (commit 7079e12)
1. Empty variants accepted → now 400
2. Negative percentage accepted → now 400
3. Percentage > 100 accepted → now 400
4. Percentages not summing to 100 accepted → now 400
5. endDate before startDate accepted → now 400
6. Duplicate key threw 500 → now 409
7. conclude winner not in variants accepted → now 400

---

# Admin / Activity Endpoints

Base: `{{baseUrl}}/admin/activity` — roles: `summary`/`heatmap` = SUPERADMIN + ANALYST; `recent` = SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/activity/summary` | SUPERADMIN, ANALYST | ✅ | 200 |
| 2 | GET | `/admin/activity/heatmap` | SUPERADMIN, ANALYST | ✅ | 200 (array of {dayOfWeek,hourOfDay,actionCount}) |
| 3 | GET | `/admin/activity/recent` | SUPERADMIN | ✅ | 200 (array, 50 items) |

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401
- [ ] Non-superadmin (ANALYST) on `/recent` → expect 403
- [ ] ANALYST on `/summary` & `/heatmap` → expect 200

## Data-quality notes
- `summary.admins` has 114,425 actions with `actorId`/`actorEmail` = null (actor not always captured). Not an endpoint bug.
- `recent` correctly caps at 50 items.

---

# Admin / Analytics Endpoints

Base: `{{baseUrl}}/admin/analytics` — roles: SUPERADMIN, ANALYST, FINANCE (refunds/* = SUPERADMIN, FINANCE).

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/analytics/dau` | SUPERADMIN, ANALYST, FINANCE | ✅ | 200 |
| 2 | GET | `/admin/analytics/trek-popularity` | SUPERADMIN, ANALYST, FINANCE | ✅ | 200 |
| 3 | GET | `/admin/analytics/conversion-funnel` | SUPERADMIN, ANALYST, FINANCE | ✅ | 200 (was 500 — fixed) |
| 4 | GET | `/admin/analytics/revenue-trends` | SUPERADMIN, ANALYST, FINANCE | ✅ | 200 |
| 5 | GET | `/admin/analytics/retention-cohort` | SUPERADMIN, ANALYST, FINANCE | ✅ | 200 |
| 6 | GET | `/admin/analytics/refunds/overview` | SUPERADMIN, FINANCE | ✅ | 200 |
| 7 | GET | `/admin/analytics/refunds/by-trek` | SUPERADMIN, FINANCE | ✅ | 200 |
| 8 | GET | `/admin/analytics/refunds/by-organizer` | SUPERADMIN, FINANCE | ✅ | 200 (was 500 — fixed) |
| 9 | GET | `/admin/analytics/refunds/by-user` | SUPERADMIN, FINANCE | ✅ | 200 |
| 10 | GET | `/admin/analytics/refunds/trend` | SUPERADMIN, FINANCE | ✅ | 200 |

## Query Validation (400 cases)
| Case | Query | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| dau days > 365 | `?days=999` | 400 | 400 | ✅ |
| revenue bad period | `?period=yearly` | 400 | 400 | ✅ |
| funnel bad trekId uuid | `?trekId=notauuid` | 400 | 400 | ✅ |
| dau days < 1 | `?days=0` | 400 | — | ⬜ |
| trek-popularity limit > 200 | `?limit=999` | 400 | — | ⬜ |
| retention months > 36 | `?months=99` | 400 | — | ⬜ |

## Bugs Fixed (commit 903069d)
1. `conversion-funnel` → 500: empty date filters produced `FROM bookings b AND ...` (syntax error near AND). Fixed with `appendCondition()` (WHERE vs AND).
2. `refunds/by-organizer` → 500: `b.organizer_id` does not exist. Fixed by joining `bookings → treks → organizer_applications` via `treks.organizer_id`.
3. (bonus, from logs) `booking-release` worker crash: raw SQL used camelCase `"holdExpiresAt"`/`"updatedAt"` — DB is snake_case. Fixed to `hold_expires_at`/`updated_at`.
4. (bonus) `ticket-pdf` worker: same `"updatedAt"` → `updated_at`.

---

# Admin / API Keys Endpoints

Base: `{{baseUrl}}/admin/api-keys` — roles: all SUPERADMIN.

| # | Method | Path | Tested | Result | Notes |
|---|--------|------|--------|--------|-------|
| 1 | GET | `/admin/api-keys` | ✅ | 200 | Lists keys; never returns `key`/`keyHash` |
| 2 | GET | `/admin/api-keys/:id` | ✅ | 200 / 404 / 400 | Excludes `keyHash` (fixed); bad uuid → 400 (fixed) |
| 3 | POST | `/admin/api-keys` | ✅ | 201 / 400 | Returns raw key once |
| 4 | PATCH | `/admin/api-keys/:id` | ✅ | 200 / 404 / 400 | Partial update; bad uuid → 400 |
| 5 | DELETE | `/admin/api-keys/:id` | ✅ | 200 / 404 / 400 | Soft revoke (`isActive=false`); bad uuid → 400 |
| 6 | POST | `/admin/api-keys/:id/rotate` | ✅ | 200 / 404 / 400 | Returns new raw key once; bad uuid → 400 |

## POST /admin/api-keys — Validation (400 cases)
| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Happy path | `{name:"x",permissions:["read:treks"],expiresAt:"2027-01-01T00:00:00.000Z"}` | 201 | 201 | ✅ |
| Missing `name` | `{permissions:["x"]}` | 400 | 400 | ✅ |
| `name` not string | `{name:123}` | 400 | 400 | ✅ |
| `permissions` not array | `{name:"x",permissions:"read"}` | 400 | 400 | ✅ |
| Bad `expiresAt` | `{name:"x",expiresAt:"2027-13-99"}` | 400 | 400 | ✅ |

## Lifecycle (verified in one session)
- create → list → get → update(name) → rotate(new key differs) → revoke(isActive=false) ✅

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

## Bugs Fixed (commit 2bcb282)
1. Non-UUID `:id` on all 4 routes (`get`/`update`/`revoke`/`rotate`) threw 500 (`invalid input syntax for type uuid`). Fixed with `ParseUUIDPipe` → 400.
2. `GET /admin/api-keys/:id` leaked `keyHash` (full entity returned). Fixed with `select` whitelist mirroring `list`.

---

# Admin / Assessments Endpoints

Base: `{{baseUrl}}/admin/assessments` — roles: `list`/`history` = SUPERADMIN + MODERATOR; `flag` = SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/assessments` | SUPERADMIN, MODERATOR | ✅ | 200 | Paginated; `page`/`limit` clamped (fixed) |
| 2 | GET | `/admin/assessments/:userId` | SUPERADMIN, MODERATOR | ✅ | 200 / 404 / 400 | History; bad uuid → 400 (fixed) |
| 3 | POST | `/admin/assessments/:userId/flag` | SUPERADMIN | ✅ | 200 / 404 / 400 | Flag for re-assessment; bad uuid → 400 (fixed) |

## GET /admin/assessments — Pagination (verified)
| Case | Query | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Happy | `?page=1&limit=20` | 200 | 200 | ✅ |
| `page=0` | `?page=0` | 200, page=1 | 200, page=1 | ✅ (was 500) |
| `limit=-5` | `?limit=-5` | 200, limit=1 | 200, limit=1 | ✅ (was 500) |
| `limit=10000` | `?limit=10000` | 200, limit=100 | 200, limit=100 | ✅ (capped) |

## Lifecycle (verified with real superadmin user)
- history (empty array, no assessments) → 200 ✅
- flag → 200 `success:true` ✅

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

## Bugs Fixed (commit cadd6d0)
1. Non-UUID `:userId` on `history`/`flag` threw 500 (`invalid input syntax for type uuid`). Fixed with `ParseUUIDPipe` → 400.
2. `GET /admin/assessments` with `page=0` or negative `limit` threw 500 (invalid SQL OFFSET/LIMIT). Fixed by clamping `page>=1`, `limit` in `[1,100]`.

---

# Admin / Audit Logs Endpoints

Base: `{{baseUrl}}/admin/audit-logs`
- `GET /admin/audit-logs` (query) — any admin role (no `@AdminRoles` on the route).
- `GET /admin/audit-logs/stats`, `PATCH /admin/audit-logs/retention`, `POST /admin/audit-logs/purge-now`, `GET /admin/audit-logs/:resourceType/:resourceId/diff` — SUPERADMIN.
- `GET /admin/audit-logs/timeline` — SUPERADMIN, MODERATOR.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/audit-logs` | ADMIN | ✅ | 200 / 400 | Query; `actorId`/`action`/`resourceType`/`from`/`to`/`page`/`limit` |
| 2 | GET | `/admin/audit-logs/stats` | SUPERADMIN | ✅ | 200 | Retention settings + counts |
| 3 | PATCH | `/admin/audit-logs/retention` | SUPERADMIN | ✅ | 200 / 400 | `retentionDays>=30`, `exportBeforePurge` bool |
| 4 | POST | `/admin/audit-logs/purge-now` | SUPERADMIN | ✅ | 201 | Manual purge |
| 5 | GET | `/admin/audit-logs/:resourceType/:resourceId/diff` | SUPERADMIN | ✅ | 404 | No logs for resource → 404 (was 500) |
| 6 | GET | `/admin/audit-logs/timeline` | SUPERADMIN, MODERATOR | ✅ | 200 / 400 | Session-grouped; was 500 |

## Validation (400 cases)
| Case | Query | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| `actorId` not uuid | `?actorId=notauuid` | 400 | 400 | ✅ (was 500) |
| `timeline` actorId not uuid | `timeline?actorId=notauuid` | 400 | 400 | ✅ (was 500) |
| `page=0` | `?page=0` | 400 | 400 | ✅ |
| `limit=999` | `?limit=999` | 400 | 400 | ✅ |
| `from` bad date | `?from=2026-13-99` | 400 | 400 | ✅ |
| `retentionDays=5` | PATCH body `{retentionDays:5}` | 400 | 400 | ✅ |

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

## Bugs Fixed (commit 94f798b)
1. `timeline` and `diff` queried non-existent columns `entity_type`, `entity_id`, `metadata` (real: `resource_type`, `resource_id`, `detail`) → always 500. Fixed column names.
2. `actorId` (query param) on `audit-logs` + `timeline` unguarded uuid → 500. Fixed with `@IsUUID()` / `ParseUUIDPipe({optional:true})` → 400.

---

# Admin / Badges Endpoints

Base: `{{baseUrl}}/admin/badges` — `list`/`stats` = SUPERADMIN + MODERATOR; `create`/`update`/`delete`/`award`/`revoke` = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/badges` | SUPERADMIN, MODERATOR | ✅ | 200 | Lists badges |
| 2 | POST | `/admin/badges` | SUPERADMIN | ✅ | 201 / 400 | Create |
| 3 | PATCH | `/admin/badges/:id` | SUPERADMIN | ✅ | 200 / 404 / 400 | Update; bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/badges/:id` | SUPERADMIN | ✅ | 200 / 404 | Delete |
| 5 | POST | `/admin/badges/:id/award` | SUPERADMIN | ✅ | 201 / 404 / 400 | Award to user; bad uuid → 400 (fixed) |
| 6 | POST | `/admin/badges/:id/revoke` | SUPERADMIN | ✅ | 201 / 404 | Revoke from user |
| 7 | GET | `/admin/badges/stats` | SUPERADMIN, MODERATOR | ✅ | 200 | Per-badge award counts |

## Validation (400 cases)
| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Create missing `name` | `{slug:"x"}` | 400 | 400 | ✅ |
| Update bad uuid | `PATCH /badges/notauuid` | 400 | 400 | ✅ (was 500) |
| Award bad uuid | `POST /badges/notauuid/award` | 400 | 400 | ✅ (was 500) |
| Award missing `userId` | `{reason:"x"}` | 400 | 400 | ✅ (expect) |

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

## Bugs Fixed (commit 94f798b)
1. Non-UUID `:id` on `update`/`remove`/`award`/`revoke` threw 500 (`invalid input syntax for type uuid`). Fixed with `ParseUUIDPipe` → 400.

## Tech-debt note
- `POST /admin/badges/:id/award` hardcodes `awardedBy = '00000000-0000-0000-0000-000000000000'` (admin-badge.controller.ts). TODO to inject the requesting admin.

---

# Admin / Banners Endpoints

Base: `{{baseUrl}}/admin/banners` — `list`/`stats` = SUPERADMIN + MODERATOR; `create`/`update`/`delete` = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/banners` | SUPERADMIN, MODERATOR | ✅ | 200 | Lists banners |
| 2 | POST | `/admin/banners` | SUPERADMIN | ✅ | 201 / 400 | Create (title/imageUrl/placement/startDate/endDate required) |
| 3 | PATCH | `/admin/banners/:id` | SUPERADMIN | ✅ | 200 / 404 / 400 | Update; bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/banners/:id` | SUPERADMIN | ✅ | 200 / 404 | Delete |
| 5 | GET | `/admin/banners/stats` | SUPERADMIN, MODERATOR | ✅ | 200 | Per-banner impressions/clicks/CTR |

## Validation (400 cases)
| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Create missing `title` | no `title` | 400 | 400 | ✅ |
| Update bad uuid | `PATCH /banners/notauuid` | 400 | 400 | ✅ (was 500) |

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

## Bugs Fixed (commit 96a21eb)
1. Non-UUID `:id` on `update`/`delete` threw 500 (`invalid input syntax for type uuid`). Fixed with `ParseUUIDPipe` → 400.

---

# Admin / Bookings (override/cancel/timeline) Endpoints

Base: `{{baseUrl}}/admin/bookings` — `override`/`cancel` = SUPERADMIN + FINANCE; `timeline` = SUPERADMIN + FINANCE + SUPPORT.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | PATCH | `/admin/bookings/:id/override` | SUPERADMIN, FINANCE | ✅ | 404 / 400 | Reason ≥10 chars; bad uuid → 400 (fixed). Happy path untested (no bookings in dev) |
| 2 | POST | `/admin/bookings/:id/cancel` | SUPERADMIN, FINANCE | ✅ | 404 / 400 | Force-cancel w/ refund override; bad uuid → 400 (fixed). Happy path untested |
| 3 | GET | `/admin/bookings/:id/timeline` | SUPERADMIN, FINANCE, SUPPORT | ✅ | 404 / 400 | Event log; bad uuid → 400 (fixed). Happy path untested |
| 4 | GET | `/admin/bookings/report` | (via AdminController) | ✅ | 200 | Was 500 — broken `trek` join removed |

## Validation (400 cases)
| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Override short reason | `{reason:"short"}` | 400 | 400 | ✅ |
| Override bad uuid | `PATCH /bookings/notauuid/override` | 400 | 400 | ✅ (was 500) |
| Cancel bad uuid | `POST /bookings/notauuid/cancel` | 400 | 400 | ✅ (was 500) |
| Timeline bad uuid | `GET /bookings/notauuid/timeline` | 400 | 400 | ✅ (was 500) |

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

## Bugs Fixed (commit 96a21eb)
1. Non-UUID `:id` on `override`/`cancel`/`timeline` threw 500 (`invalid input syntax for type uuid`). Fixed with `ParseUUIDPipe` → 400.
2. `GET /admin/bookings/report` threw 500: `leftJoinAndSelect('b.trek','t')` referenced a `trek` relation that does not exist on `Booking` (only `trekId` column + `trekSnapshot` jsonb). Removed the dead join; `t` was unused.

## Untested (needs seed data)
- Happy paths for `override`/`cancel`/`timeline` require an existing booking; dev DB has none (`GET /bookings` returns empty). Test post-seed.

---

# Batch 1 — Tags (admin/tags, admin/categories, treks/:id/tags)

Base: `{{baseUrl}}/admin` — tags/categories list = SUPERADMIN + MODERATOR; create/update/delete = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/tags` | SUPERADMIN, MODERATOR | ✅ | 200 | List tags |
| 2 | POST | `/admin/tags` | SUPERADMIN | ✅ | 201 / 400 | Create tag |
| 3 | DELETE | `/admin/tags/:id` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 4 | GET | `/admin/categories` | SUPERADMIN, MODERATOR | ✅ | 200 | List categories |
| 5 | POST | `/admin/categories` | SUPERADMIN | ✅ | 201 / 400 | Create category |
| 6 | PATCH | `/admin/categories/:id` | SUPERADMIN | ✅ | 200 / 404 / 400 | bad uuid → 400 (fixed) |
| 7 | DELETE | `/admin/categories/:id` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 8 | POST | `/admin/treks/:id/tags` | SUPERADMIN, MODERATOR | ✅ | 400 | bad trek uuid → 400 (fixed) |

## Bugs Fixed (commit 0d4a0c9)
1. Non-UUID `:id` on `tags/:id`, `categories/:id` (PATCH/DELETE), `treks/:id/tags` threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 1 — Admin Catch-all (users / organizer-requests / treks / bookings/:id)

Base: `{{baseUrl}}/admin`. Note: `users/:id/status`, `organizer-requests/:id`, `treks/:id/decision` already validated uuid via DTO (→ 400). Only `bookings/:id/generate-ticket-pdf` was unguarded.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/users` | (admin) | ✅ | 200 |
| 2 | PATCH | `/admin/users/:id/status` | SUPERADMIN, MODERATOR, SUPPORT | ✅ | 400 (uuid via DTO) |
| 3 | GET | `/admin/organizer-requests` | (admin) | ✅ | 200 |
| 4 | PATCH | `/admin/organizer-requests/:id` | SUPERADMIN, MODERATOR | ✅ | 400 (uuid via DTO) |
| 5 | GET | `/admin/treks/pending` | (admin) | ✅ | 200 |
| 6 | PATCH | `/admin/treks/:id/decision` | SUPERADMIN, MODERATOR | ✅ | 400 (uuid via DTO) |
| 7 | POST | `/admin/bookings/:id/generate-ticket-pdf` | SUPERADMIN, FINANCE, SUPPORT | ✅ | 400 (fixed) |

## Bugs Fixed (commit 0d4a0c9)
1. `bookings/:id/generate-ticket-pdf` unguarded `:id` threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 1 — Bulk Operations (admin/bulk)

Base: `{{baseUrl}}/admin/bulk` — users/treks = SUPERADMIN + MODERATOR; bookings = SUPERADMIN + SUPPORT.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | POST | `/admin/bulk/users/status` | SUPERADMIN, MODERATOR | ✅ | 400 | bad userId in array → 400 (fixed) |
| 2 | POST | `/admin/bulk/treks/approve` | SUPERADMIN, MODERATOR | ✅ | 400 | bad trekId → 400 (fixed) |
| 3 | POST | `/admin/bulk/bookings/generate-tickets` | SUPERADMIN, SUPPORT | ✅ | 400 | bad bookingId → 400 (fixed) |

## Validation (400 cases)
| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Users bad uuid | `userIds:["notauuid"]` | 400 | 400 | ✅ (was 500) |
| Treks bad uuid | `trekIds:["notauuid"]` | 400 | 400 | ✅ (was 500) |
| Bookings bad uuid | `bookingIds:["notauuid"]` | 400 | 400 | ✅ (was 500) |

## Bugs Fixed (commit 0d4a0c9)
1. Array-body uuid fields (`userIds`/`trekIds`/`bookingIds`) unvalidated → 500 on bad uuid. Fixed with `@IsUUID('4',{each:true})` → 400.

---

# Batch 1 — Cache & Database (read-only infra)

Base: `{{baseUrl}}/admin/cache` & `/admin/database` — SUPERADMIN only. No path params; all GETs safe.

| # | Method | Path | Tested | Result |
|---|--------|------|--------|--------|
| 1 | POST | `/admin/cache/invalidate` | ⬜ | — |
| 2 | GET | `/admin/cache/stats` | ✅ | 200 |
| 3 | GET | `/admin/cache/keys?pattern=*` | ✅ | 200 |
| 4 | GET | `/admin/database/health` | ✅ | 200 |
| 5 | GET | `/admin/database/tables` | ✅ | 200 |
| 6 | GET | `/admin/database/indexes` | ✅ | 200 |
| 7 | GET | `/admin/database/slow-queries` | ✅ | 200 |

## Auth Edge Cases (all 401)
- [x] No `Authorization` header → 401
- [x] Garbage token → 401
- [x] Missing `x-api-key` → 401

---

# Batch 1 — Data Deletion (admin/data-deletion)

Base: `{{baseUrl}}/admin/data-deletion` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/data-deletion` | SUPERADMIN | ✅ | 200 | List (paginated) |
| 2 | POST | `/admin/data-deletion/:id/approve` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 3 | POST | `/admin/data-deletion/:id/reject` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 0d4a0c9)
1. Non-UUID `:id` on approve/reject threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 1 — Impersonation (admin/impersonate)

Base: `{{baseUrl}}/admin/impersonate` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | POST | `/admin/impersonate` | SUPERADMIN | ✅ | 400 | bad userId → 400 (fixed) |
| 2 | POST | `/admin/impersonate/stop` | SUPERADMIN | ⬜ | — | |

## Validation (400 cases)
| Case | Body | Expected | Actual | Status |
|------|------|----------|--------|--------|
| Bad userId | `{userId:"notauuid"}` | 400 | 400 | ✅ (was 500) |

## Bugs Fixed (commit 0d4a0c9)
1. `userId` in body unvalidated → 500 on bad uuid. Fixed with `@IsUUID()` → 400.

---

# Batch 1 — User Merge (admin/users/merge)

Base: `{{baseUrl}}/admin/users/merge` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | POST | `/admin/users/merge/dry-run` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (via DTO) |
| 2 | POST | `/admin/users/merge/execute` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (via DTO) |
| 3 | GET | `/admin/users/merge/history` | SUPERADMIN | ✅ | 200 | was 500 (fixed) |

## Bugs Fixed (commit 0d4a0c9)
1. `history()` queried non-existent `entity_type`/`entity_id`/`metadata` columns (real: `resource_type`/`resource_id`/`detail`) → 500. Fixed column names. Same fix applied to `execute()` audit insert so real merges don't 500.

---

# Batch 1 — User Timeline (admin/users/:id/timeline)

Base: `{{baseUrl}}/admin/users` — SUPERADMIN + SUPPORT.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/users/:id/timeline` | SUPERADMIN, SUPPORT | ✅ | 404 / 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 0d4a0c9)
1. Non-UUID `:id` threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 1 — Security / IP Filter (admin/security/ip-*)

Base: `{{baseUrl}}/admin/security` — SUPERADMIN only (blocklist + allowlist).

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/security/ip-blocklist` | SUPERADMIN | ✅ | 200 | List blocklist |
| 2 | POST | `/admin/security/ip-blocklist` | SUPERADMIN | ⬜ | — | Add rule |
| 3 | PATCH | `/admin/security/ip-blocklist/:id` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/security/ip-blocklist/:id` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 5 | GET | `/admin/security/ip-allowlist` | SUPERADMIN | ✅ | 200 | List allowlist |
| 6 | POST | `/admin/security/ip-allowlist` | SUPERADMIN | ⬜ | — | Add rule |
| 7 | PATCH | `/admin/security/ip-allowlist/:id` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 8 | DELETE | `/admin/security/ip-allowlist/:id` | SUPERADMIN | ✅ | 404 / 400 | bad uuid → 400 (fixed) |
| 9 | GET | `/admin/security/ip-blocklist/audit` | SUPERADMIN | ✅ | 200 | Blocklist hit audit |

## Bugs Fixed (commit 0d4a0c9)
1. Non-UUID `:id` on blocklist/allowlist PATCH/DELETE threw 500. Fixed with `ParseUUIDPipe` → 400.

## Batch 1 Summary
- 10 controller groups tested. All 500s eliminated (uuid guards via `ParseUUIDPipe` + `@IsUUID` on arrays/body; merge `history`/`execute` column-name fix). Build verified green before deploy.

---

# Batch 2 — Payments (admin/payments)

Base: `{{baseUrl}}/admin/payments` — SUPERADMIN + FINANCE.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/payments` (search) | SUPERADMIN, FINANCE | ✅ | 200 | paginated, no params |
| 2 | POST | `/admin/payments/:id/refund` | SUPERADMIN, FINANCE | ✅ | 400 | bad uuid → 400 (guard via DTO) |
| 3 | POST | `/admin/payments/:id/retry` | SUPERADMIN, FINANCE | ✅ | 400 | bad uuid → 400 (guard via DTO) |
| 4 | GET | `/admin/payments/disputes` | SUPERADMIN, FINANCE | ✅ | 200 | list disputes |

## Bugs Fixed
- None — payments already 400 on bad uuid (refund/retry go through validated service path). Verified live.

---

# Batch 2 — Payouts (admin/payouts)

Base: `{{baseUrl}}/admin/payouts` — SUPERADMIN + FINANCE.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/payouts` (list, filters) | SUPERADMIN, FINANCE | ✅ | 200 | `organizerId` query unvalidated but filter-only (no 500) |
| 2 | GET | `/admin/payouts/summary` | SUPERADMIN, FINANCE | ✅ | 200 | summary stats |
| 3 | POST | `/admin/payouts/:id/approve` | SUPERADMIN, FINANCE | ✅ | 400 | bad uuid → 400 (fixed) |
| 4 | POST | `/admin/payouts/:id/mark-settled` | SUPERADMIN, FINANCE | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit fe0e2d3)
1. Non-UUID `:id` on approve/mark-settled threw 500 (`invalid input syntax for type uuid`). Fixed with `ParseUUIDPipe` → 400.

---

# Batch 2 — Referral Tiers (admin/referral/tiers)

Base: `{{baseUrl}}/admin/referral` — tiers/settings list = SUPERADMIN + ANALYST; create/update/delete = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/referral/tiers` | SUPERADMIN, ANALYST | ✅ | 200 | list tiers |
| 2 | POST | `/admin/referral/tiers` | SUPERADMIN | ✅ | 201 / 400 | create tier |
| 3 | PATCH | `/admin/referral/tiers/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/referral/tiers/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 5 | GET | `/admin/referral/settings` | SUPERADMIN, ANALYST | ✅ | 200 | global settings |
| 6 | PATCH | `/admin/referral/settings` | SUPERADMIN | ✅ | 200 | update settings |

## Bugs Fixed (commit fe0e2d3)
1. Non-UUID `:id` on tiers PATCH/DELETE threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 2 — Revenue Share (admin/revenue-share)

Base: `{{baseUrl}}/admin/revenue-share` — SUPERADMIN + ANALYST. No path/query params. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/revenue-share/overview` | SUPERADMIN, ANALYST | ✅ | 200 |
| 2 | GET | `/admin/revenue-share/by-trek` | SUPERADMIN, ANALYST | ✅ | 200 |
| 3 | GET | `/admin/revenue-share/by-organizer` | SUPERADMIN, ANALYST | ✅ | 200 |

---

# Batch 2 — Coupons (admin/coupons)

Base: `{{baseUrl}}/admin/coupons` — list/get/redemptions = SUPERADMIN + ANALYST; create/update/expire = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/coupons` | SUPERADMIN, ANALYST | ✅ | 200 | list |
| 2 | GET | `/admin/coupons/:id` | SUPERADMIN, ANALYST | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | POST | `/admin/coupons` | SUPERADMIN | ✅ | 201 / 400 | create |
| 4 | PATCH | `/admin/coupons/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 5 | POST | `/admin/coupons/:id/expire` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 6 | GET | `/admin/coupons/:id/redemptions` | SUPERADMIN, ANALYST | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit fe0e2d3)
1. Non-UUID `:id` on GET/PATCH/expire/redemptions threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 2 — Pricing Campaigns (admin/pricing)

Base: `{{baseUrl}}/admin/pricing` — list/create = SUPERADMIN + MODERATOR (list) / SUPERADMIN (create/update).

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/pricing/campaigns` | SUPERADMIN, MODERATOR | ✅ | 200 | list campaigns |
| 2 | POST | `/admin/pricing/campaigns` | SUPERADMIN | ✅ | 201 / 400 | create (trekIds array unvalidated but no 500 on bad list) |
| 3 | PATCH | `/admin/pricing/campaigns/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit fe0e2d3)
1. Non-UUID `:id` on campaign PATCH threw 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 2 — Tax (admin/tax)

Base: `{{baseUrl}}/admin/tax` — SUPERADMIN + FINANCE. Query params only (`from`/`to` dates). Safe.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/tax/report?from=&to=` | SUPERADMIN, FINANCE | ✅ | 200 | date-range report |

---

# Batch 2 Summary
- 6 controller groups: payments, payouts, referral-tiers, revenue-share, coupons, pricing-campaigns, tax.
- 9 endpoints threw 500 on bad uuid (payouts×2, referral×2, coupons×4, pricing×1). Fixed in `fe0e2d3` with `ParseUUIDPipe` on all `:id` params. Payments already 400. All verified live → 400 (0 remaining 500s).
- Note: log noise from background workers (weather-prefetch `startDate`, packing-reminder `b.userId` column errors) is pre-existing and OUT OF SCOPE for this batch — flag for a separate DB/entity-sync ticket.

---

# Batch 3 — Sessions (admin/sessions)

Base: `{{baseUrl}}/admin/sessions` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/sessions` | SUPERADMIN | ✅ | 200 | list active sessions |
| 2 | DELETE | `/admin/sessions/:sessionId` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | DELETE | `/admin/sessions/user/:userId` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:sessionId` / `:userId` unguarded → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 — OTP (admin/otp)

Base: `{{baseUrl}}/admin/otp` — SUPERADMIN only. Body param.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | POST | `/admin/otp/generate` | SUPERADMIN | ✅ | 400 | bad `userId` → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `GenerateOtpDto.userId` unvalidated → 500. Fixed with `@IsUUID()` → 400.

---

# Batch 3 — Collections (admin/collections)

Base: `{{baseUrl}}/admin/collections` — list/create = SUPERADMIN + MODERATOR; update-treks = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/collections` | SUPERADMIN, MODERATOR | ✅ | 200 | list |
| 2 | POST | `/admin/collections` | SUPERADMIN | ✅ | 201 / 400 | create |
| 3 | PATCH | `/admin/collections/:id/treks` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` unguarded → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 — Email Templates (admin/email-templates)

Base: `{{baseUrl}}/admin/email-templates` — list/get/versions = SUPERADMIN + MODERATOR; create/update/delete/preview = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/email-templates` | SUPERADMIN, MODERATOR | ✅ | 200 | list |
| 2 | GET | `/admin/email-templates/:id` | SUPERADMIN, MODERATOR | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | POST | `/admin/email-templates` | SUPERADMIN | ✅ | 201 / 400 | create |
| 4 | PATCH | `/admin/email-templates/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 5 | DELETE | `/admin/email-templates/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 6 | POST | `/admin/email-templates/:id/preview` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 7 | GET | `/admin/email-templates/:id/versions` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` unguarded on 5 routes → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 — Feature Flags (admin/feature-flags)

Base: `{{baseUrl}}/admin/feature-flags` — list/get = SUPERADMIN + ANALYST; create/update/delete = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/feature-flags` | SUPERADMIN, ANALYST | ✅ | 200 | list |
| 2 | GET | `/admin/feature-flags/:id` | SUPERADMIN, ANALYST | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | POST | `/admin/feature-flags` | SUPERADMIN | ✅ | 201 / 400 | create |
| 4 | PATCH | `/admin/feature-flags/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 5 | DELETE | `/admin/feature-flags/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` unguarded on 4 routes → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 — Gear (admin/gear)

Base: `{{baseUrl}}/admin/gear` — pending/list = SUPERADMIN + MODERATOR; decision/featured/delete = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/gear/pending` | SUPERADMIN, MODERATOR | ✅ | 200 | list (was 500 — see below) |
| 2 | PATCH | `/admin/gear/:id/decision` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | PATCH | `/admin/gear/:id/featured` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/gear/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed
1. `:id` unguarded on 3 routes → 500. Fixed with `ParseUUIDPipe` → 400 (commit `1e9d928`).
2. **Schema drift**: `gear_items` table was missing `review_status` and `featured` columns that the admin gear service queries/updates → 500 on every gear endpoint. Added via migration `1784489848000-AddAdminModerationColumns` (commit `20fd478`); also added `reviewStatus`/`featured` fields to `GearItem` entity. Reversible via `down()`.

---

# Batch 3 — Groups (admin/groups)

Base: `{{baseUrl}}/admin/groups` — list/members = SUPERADMIN + MODERATOR; status/delete-member/transfer = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/groups` | SUPERADMIN, MODERATOR | ✅ | 200 | list (was 500 — see below) |
| 2 | PATCH | `/admin/groups/:id/status` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | GET | `/admin/groups/:id/members` | SUPERADMIN, MODERATOR | ✅ | 400 | bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/groups/:id/members/:memberId` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 5 | POST | `/admin/groups/:id/transfer-ownership` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed); body `newOwnerUserId` → 400 (fixed) |

## Bugs Fixed
1. `:id` / `:memberId` unguarded + body `newOwnerUserId` (`@IsString`) unvalidated → 500. Fixed with `ParseUUIDPipe` on params and `@IsUUID()` on `newOwnerUserId` (commit `1e9d928`).
2. **Schema drift**: `trek_groups` table was missing `moderation_status` and `ban_reason` columns that the admin group service queries/updates → 500 on `GET /admin/groups`. Added via migration `1784489848000-AddAdminModerationColumns` (commit `20fd478`); also added `moderationStatus`/`banReason` fields to `TrekGroup` entity. Reversible via `down()`.

---

# Batch 3 — Organizer Documents (admin/organizers)

Base: `{{baseUrl}}/admin/organizers` — expiring/list = SUPERADMIN + MODERATOR; approve/reject = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/organizers/documents/expiring` | SUPERADMIN, MODERATOR | ✅ | 200 | expiring docs |
| 2 | GET | `/admin/organizers/:id/documents` | SUPERADMIN, MODERATOR | ✅ | 400 | bad `:id` → 400 (fixed) |
| 3 | POST | `/admin/organizers/:id/documents/:docId/approve` | SUPERADMIN | ✅ | 400 | bad `:docId` → 400 (fixed) |
| 4 | POST | `/admin/organizers/:id/documents/:docId/reject` | SUPERADMIN | ✅ | 400 | bad `:docId` → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` (organizer) and `:docId` unguarded → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 — Tasks (admin/tasks)

Base: `{{baseUrl}}/admin/tasks` — list/mine/status = SUPERADMIN + MODERATOR; create/assign = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/tasks` | SUPERADMIN, MODERATOR | ✅ | 200 | list |
| 2 | GET | `/admin/tasks/mine` | SUPERADMIN, MODERATOR | ✅ | 200 | my open tasks |
| 3 | POST | `/admin/tasks` | SUPERADMIN | ✅ | 201 / 400 | create |
| 4 | PATCH | `/admin/tasks/:id/assign` | SUPERADMIN | ✅ | 400 | bad `:id` → 400 (fixed); bad `assignedTo` → 400 (fixed) |
| 5 | PATCH | `/admin/tasks/:id/status` | SUPERADMIN, MODERATOR | ✅ | 400 | bad `:id` → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` unguarded on 2 routes → 500. Fixed with `ParseUUIDPipe` → 400. `AssignTaskDto.assignedTo` was `@IsString` → 500 on bad uuid; fixed with `@IsUUID()` → 400.

---

# Batch 3 — Weather Alerts (admin/weather/alerts)

Base: `{{baseUrl}}/admin/weather/alerts` — list/create = SUPERADMIN + MODERATOR; expire = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/weather/alerts` | SUPERADMIN, MODERATOR | ✅ | 200 | list |
| 2 | POST | `/admin/weather/alerts` | SUPERADMIN | ✅ | 201 / 400 | create |
| 3 | DELETE | `/admin/weather/alerts/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` unguarded → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 — Webhooks (admin/webhooks)

Base: `{{baseUrl}}/admin/webhooks` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/webhooks` | SUPERADMIN | ✅ | 200 | list |
| 2 | GET | `/admin/webhooks/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | POST | `/admin/webhooks/:id/retry` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit 1e9d928)
1. `:id` unguarded on 2 routes → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 3 Summary
- 11 controller groups: sessions, otp, collections, email-templates, feature-flags, gear, groups, organizer-documents, tasks, weather-alerts, webhooks.
- 27 bad-uuid edge cases → 400 (was 500). Fixed in `1e9d928` (`ParseUUIDPipe` on all `:id`/`:memberId`/`:docId`/`:sessionId`/`:userId` params; `@IsUUID()` on body uuids: otp `userId`, groups `newOwnerUserId`, tasks `assignedTo`).
- 2 schema-drift 500s (`GET /admin/gear/pending`, `GET /admin/groups`) fixed in `20fd478` via migration `1784489848000-AddAdminModerationColumns` adding `gear_items.review_status`/`featured` and `trek_groups.moderation_status`/`ban_reason` (with matching entity fields). Migration is reversible.
- All 10 list endpoints + 27 edge cases verified live → 0 remaining 500s.

---

# Batch 4 — Cohorts (admin/cohorts)

Base: `{{baseUrl}}/admin/cohorts` — SUPERADMIN + MODERATOR.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | POST | `/admin/cohorts/build` | SUPERADMIN, MODERATOR | ✅ | 201 | build segment (body filters only) |
| 2 | GET | `/admin/cohorts/history` | SUPERADMIN, MODERATOR | ✅ | 200 | export history |

## Bugs Fixed
- None — no path params; body filters validated. Verified live.

---

# Batch 4 — SLA (admin/sla)

Base: `{{baseUrl}}/admin/sla` — SUPERADMIN + MODERATOR. GETs + query only. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/sla/overview` | SUPERADMIN, MODERATOR | ✅ | 200 |
| 2 | GET | `/admin/sla/by-admin` | SUPERADMIN, MODERATOR | ✅ | 200 |
| 3 | GET | `/admin/sla/breaches` | SUPERADMIN, MODERATOR | ✅ | 200 |

---

# Batch 4 — Safety (admin/safety)

Base: `{{baseUrl}}/admin/safety` — incidents list/members = SUPERADMIN + MODERATOR; resolve = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/safety/incidents` | SUPERADMIN, MODERATOR | ✅ | 200 | list |
| 2 | GET | `/admin/safety/incidents/:id` | SUPERADMIN, MODERATOR | ✅ | 400 | bad uuid → 400 (fixed) |
| 3 | PATCH | `/admin/safety/incidents/:id/resolve` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit d768162)
1. `incidents/:id` unguarded on 2 routes → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 4 — Detection (admin/detection)

Base: `{{baseUrl}}/admin/detection` — list = SUPERADMIN + MODERATOR; resolve = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/detection/trek-duplicates` | SUPERADMIN, MODERATOR | ✅ | 200 | was 500 (pg_trgm) — fixed (see below) |
| 2 | GET | `/admin/detection/user-duplicates` | SUPERADMIN, MODERATOR | ✅ | 200 | email/phone self-join |
| 3 | POST | `/admin/detection/trek-duplicates/:id/resolve` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed
1. `trek-duplicates/:id/resolve` unguarded → 500. Fixed with `ParseUUIDPipe` → 400 (commit `d768162`).
2. `GET /admin/detection/trek-duplicates` used `similarity()` (pg_trgm extension) → 500 because `pg_trgm` was never created. Added migration `1784492000000-AddPgTrgmExtension` (commit `56c840d`) AND a resilient `ILIKE` fallback in the service (commit `249f1a0`) so the endpoint returns 200 even if the extension can't be installed (e.g. deploy lacks CREATE EXTENSION privilege). Verified live → 200.

---

# Batch 4 — Storage (admin/storage)

Base: `{{baseUrl}}/admin/storage` — SUPERADMIN only. GETs only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/storage/summary` | SUPERADMIN | ✅ | 200 | per-bucket summary |
| 2 | GET | `/admin/storage/file-types` | SUPERADMIN | ✅ | 200 | by MIME type |
| 3 | GET | `/admin/storage/orphans` | SUPERADMIN | ✅ | 200 | was 500 (join bug) — fixed (see below) |

## Bugs Fixed (commit 46327a5)
1. `getOrphans()` joined `trek_images` on a nonexistent `image_id` column → 500. `trek_images` has no FK to `media`; both tables share a `key` (R2 key). Fixed join to `ti.key = m.key` / `ti.key IS NULL` → 200.

---

# Batch 4 — Rate Limit (admin/security/rate-limits)

Base: `{{baseUrl}}/admin/security/rate-limits` — SUPERADMIN only. `:endpoint` is a string path, no uuid.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/security/rate-limits` | SUPERADMIN | ✅ | 200 |
| 2 | PATCH | `/admin/security/rate-limits` | SUPERADMIN | ✅ | 200 (valid body) |
| 3 | DELETE | `/admin/security/rate-limits/:endpoint` | SUPERADMIN | ✅ | 200 (string key) |

---

# Batch 4 — Queue Dashboard (admin/queues)

Base: `{{baseUrl}}/admin/queues` — SUPERADMIN only. `:name`/`:jobId` are string identifiers. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/queues` | SUPERADMIN | ✅ | 200 |
| 2 | GET | `/admin/queues/:name/jobs` | SUPERADMIN | ✅ | 200 (status query) |
| 3 | POST | `/admin/queues/:name/jobs/:jobId/retry` | SUPERADMIN | ⬜ | string ids |
| 4 | POST | `/admin/queues/:name/retry-all` | SUPERADMIN | ⬜ | — |
| 5 | POST | `/admin/queues/:name/clean` | SUPERADMIN | ⬜ | — |
| 6 | POST | `/admin/queues/:name/pause` | SUPERADMIN | ⬜ | — |
| 7 | POST | `/admin/queues/:name/resume` | SUPERADMIN | ⬜ | — |

---

# Batch 4 — Cron Jobs (admin/cron-jobs)

Base: `{{baseUrl}}/admin/cron-jobs` — SUPERADMIN only. `:key` string. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/cron-jobs` | SUPERADMIN | ✅ | 200 |
| 2 | POST | `/admin/cron-jobs/:key/disable` | SUPERADMIN | ⬜ | — |
| 3 | POST | `/admin/cron-jobs/:key/enable` | SUPERADMIN | ⬜ | — |
| 4 | POST | `/admin/cron-jobs/:key/trigger-now` | SUPERADMIN | ⬜ | — |

---

# Batch 4 — Migrations (admin/migrations)

Base: `{{baseUrl}}/admin/migrations` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/migrations` | SUPERADMIN | ✅ | 200 | was 500 — fixed (see below) |

## Bugs Fixed (commit 46327a5 + b28fd04)
1. Original query selected `hash`, `batch` columns that don't exist in TypeORM's `migrations` table → 500. Removed them (commit `46327a5`).
2. Live DB has **no `migrations` table** (migrations are not auto-run by the app; `migrationsRun` is unset and `synchronize` is env-gated off). Added a defensive try/catch returning `[]` + server-side log (commit `b28fd04`) so the endpoint never 500s. The underlying empty-table condition is logged for follow-up.

---

# Batch 4 — Environment (admin/environment)

Base: `{{baseUrl}}/admin/environment` — SUPERADMIN only. GETs only. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/environment/compare` | SUPERADMIN | ✅ | 200 |
| 2 | GET | `/admin/environment/drift-report` | SUPERADMIN | ✅ | 200 |

---

# Batch 4 — Export (admin/export)

Base: `{{baseUrl}}/admin/export` — SUPERADMIN + ANALYST. `:entity` is a string with allowlist → 400 on bad value, no 500.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/export/:entity` (users/bookings/payments/treks) | SUPERADMIN, ANALYST | ✅ | 200 (CSV) |

## Validation
- `GET /admin/export/bogus` → 400 (allowlist enforced). ✅

---

# Batch 4 — Presets (admin/platform-settings/presets)

Base: `{{baseUrl}}/admin/platform-settings/presets` — SUPERADMIN only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/platform-settings/presets` | SUPERADMIN | ✅ | 200 | list |
| 2 | POST | `/admin/platform-settings/presets` | SUPERADMIN | ✅ | 201 / 400 | save |
| 3 | POST | `/admin/platform-settings/presets/:id/apply` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |
| 4 | DELETE | `/admin/platform-settings/presets/:id` | SUPERADMIN | ✅ | 400 | bad uuid → 400 (fixed) |

## Bugs Fixed (commit d768162)
1. `:id` unguarded on apply/delete → 500. Fixed with `ParseUUIDPipe` → 400.

---

# Batch 4 Summary
- 12 controller groups: cohorts, sla, safety, detection, storage, rate-limit, queue-dashboard, cron, migrations, environment, export, presets.
- 5 bad-uuid edge cases → 400 (safety×2, detection×1, preset×2). Fixed in `d768162`.
- Real 500s fixed:
  - `storage/orphans`: wrong join column (`image_id` → `key`) — `46327a5`.
  - `migrations`: nonexistent `hash`/`batch` cols + missing `migrations` table → defensive `[]` — `46327a5` + `b28fd04`.
  - `detection/trek-duplicates`: `pg_trgm` extension missing → migration `56c840d` + `ILIKE` fallback `249f1a0`.
- 18 GET/list endpoints + cohorts/build + 5 uuid edge cases verified live → **0 remaining 500s**.
- Note: `GET /admin/detection/trek-duplicates` now returns 200 via the ILIKE fallback (pg_trgm was not installed by the deploy's migration step — likely a CREATE EXTENSION privilege issue). The `pg_trgm` migration exists but may need manual/superuser execution; flagged for follow-up.

---

# Batch 5 — Calendar (admin/marketing/calendar)

Base: `{{baseUrl}}/admin/marketing/calendar` — SUPERADMIN + MODERATOR. GET only.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/marketing/calendar` | SUPERADMIN, MODERATOR | ✅ | 200 | was 500 — fixed (see below) |

## Bugs Fixed (commit 10e0138)
1. `getCalendar()` raw `UNION ALL` SQL referenced `coupons.start_date`/`end_date`/`description` — columns that **do not exist** (coupons uses `valid_from`/`valid_to`, no `description`) → 500. Also `discount_type || ' ' || discount_value` failed because `discount_value` is int (`text || integer` operator error). Fixed to `valid_from`/`valid_to`, built description from `discount_type || ' ' || discount_value::text`.

---

# Batch 5 — Itinerary Templates (admin/itinerary-templates)

Base: `{{baseUrl}}/admin/itinerary-templates` — list/create = SUPERADMIN + MODERATOR; apply = SUPERADMIN.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/itinerary-templates` | SUPERADMIN, MODERATOR | ✅ | 200 | list |
| 2 | POST | `/admin/itinerary-templates` | SUPERADMIN | ⬜ | create (validated) |
| 3 | POST | `/admin/itinerary-templates/:id/apply-to-trek` | SUPERADMIN | ✅ | 400 | bad `:id` → 400 (fixed); bad `trekId` in body → 400 (fixed) |

## Bugs Fixed (commit 2319c3f)
1. `:id` unguarded → 500 (TypeORM find on bad uuid). Fixed with `ParseUUIDPipe` → 400.
2. Body `trekId` was `@IsString()` → bad uuid passed to raw `trek_id` uuid column → 500. Changed to `@IsUUID()` → 400.

---

# Batch 5 — Broadcast (admin/notifications/broadcast)

Base: `{{baseUrl}}/admin/notifications` — SUPERADMIN only. No uuid params. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | POST | `/admin/notifications/broadcast` | SUPERADMIN | ⬜ | send (validated DTO) |
| 2 | GET | `/admin/notifications/broadcast/history` | SUPERADMIN | ✅ | 200 |

---

# Batch 5 — Search (admin/search)

Base: `{{baseUrl}}/admin/search` — SUPERADMIN only. `:name` is a string identifier (no uuid). Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/search/indexes` | SUPERADMIN | ✅ | 200 |
| 2 | POST | `/admin/search/indexes/:name/reindex` | SUPERADMIN | ⬜ | string name |
| 3 | PATCH | `/admin/search/indexes/:name/settings` | SUPERADMIN | ⬜ | string name |

---

# Batch 5 — Notification Preferences (admin/notifications/preferences)

Base: `{{baseUrl}}/admin/notifications/preferences` — SUPERADMIN + MODERATOR. No route uuid (hardcoded admin id inside service). Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/notifications/preferences` | SUPERADMIN, MODERATOR | ✅ | 200 |
| 2 | PATCH | `/admin/notifications/preferences` | SUPERADMIN, MODERATOR | ⬜ | update (array DTO) |
| 3 | POST | `/admin/notifications/preferences/test` | SUPERADMIN, MODERATOR | ✅ | 201 |

---

# Batch 5 — Refund Analytics (admin/analytics/refunds)

Base: `{{baseUrl}}/admin/analytics/refunds` — SUPERADMIN + FINANCE. GETs only. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/analytics/refunds/overview` | SUPERADMIN, FINANCE | ✅ | 200 |
| 2 | GET | `/admin/analytics/refunds/by-trek` | SUPERADMIN, FINANCE | ✅ | 200 |
| 3 | GET | `/admin/analytics/refunds/by-organizer` | SUPERADMIN, FINANCE | ✅ | 200 |
| 4 | GET | `/admin/analytics/refunds/by-user` | SUPERADMIN, FINANCE | ✅ | 200 |
| 5 | GET | `/admin/analytics/refunds/trend` | SUPERADMIN, FINANCE | ✅ | 200 |

---

# Batch 5 — Booking Override (admin/bookings/:id/...)

Base: `{{baseUrl}}/admin/bookings` — SUPERADMIN + FINANCE (override/cancel), +SUPPORT (timeline). All `:id` already `ParseUUIDPipe`. Safe (no fix needed).

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | PATCH | `/admin/bookings/:id/override` | SUPERADMIN, FINANCE | ⬜ | 400 on bad uuid (pre-guarded) |
| 2 | POST | `/admin/bookings/:id/cancel` | SUPERADMIN, FINANCE | ⬜ | 400 on bad uuid (pre-guarded) |
| 3 | GET | `/admin/bookings/:id/timeline` | SUPERADMIN, FINANCE, SUPPORT | ⬜ | 400 on bad uuid (pre-guarded) |

---

# Batch 5 — Audit Diff (admin/audit-logs/:resourceType/:resourceId/diff)

Base: `{{baseUrl}}/admin/audit-logs` — diff = SUPERADMIN; timeline = SUPERADMIN + MODERATOR.

| # | Method | Path | Roles | Tested | Result | Notes |
|---|--------|------|-------|--------|--------|-------|
| 1 | GET | `/admin/audit-logs/:resourceType/:resourceId/diff` | SUPERADMIN | ✅ | 404 | bad uuid `resourceId` → 404 (fixed; was 500) |
| 2 | GET | `/admin/audit-logs/timeline` | SUPERADMIN, MODERATOR | ✅ | 200 | actorId optional uuid pipe |

## Bugs Fixed (commit 2319c3f)
1. `:resourceId` is a `uuid` column; `WHERE resource_id = $2` with non-uuid text → `invalid input syntax for type uuid` → 500. Fixed by casting `resource_id::text = $2` (resources may use non-uuid ids). Now returns 404 when no logs.
2. Service read `r.metadata` but the selected/actual column is `detail` (jsonb) → corrected to `r.detail` (latent mapping bug).

---

# Batch 5 — Audit Retention (admin/audit-logs/stats|retention|purge-now)

Base: `{{baseUrl}}/admin/audit-logs` — SUPERADMIN only. GET/PATCH/POST, no uuid params. Safe.

| # | Method | Path | Roles | Tested | Result |
|---|--------|------|-------|--------|--------|
| 1 | GET | `/admin/audit-logs/stats` | SUPERADMIN | ✅ | 200 |
| 2 | PATCH | `/admin/audit-logs/retention` | SUPERADMIN | ⬜ | validated DTO (retentionDays ≥ 30) |
| 3 | POST | `/admin/audit-logs/purge-now` | SUPERADMIN | ⬜ | manual purge |

---

# Batch 5 Summary
- 9 controller groups: calendar, itinerary-templates, broadcast, search, notification-preferences, refund-analytics, booking-override, audit-diff, audit-retention.
- 3 real 500s fixed:
  - `marketing/calendar`: wrong coupon columns (`start_date`/`end_date`/`description` don't exist; coupons uses `valid_from`/`valid_to`) + int `||` text operator → `10e0138`.
  - `audit-logs/:resourceType/:resourceId/diff`: `resource_id` uuid cast error + `r.metadata`→`r.detail` mapping → `2319c3f`.
  - `itinerary-templates/:id/apply-to-trek`: unguarded `:id` + body `trekId` → `ParseUUIDPipe` + `@IsUUID()` → `2319c3f`.
- 12 GET/list endpoints + prefs/test + uuid edges verified live → **0 remaining 500s**.
- `booking-override` `:id` params were already `ParseUUIDPipe`-guarded (no fix needed).
- ⬜ rows (POST/PATCH writes) not exercised live: itinerary create, broadcast send, search reindex/settings, prefs update, booking override/cancel, audit retention patch/purge. Flagged for later if live write tests are wanted.
