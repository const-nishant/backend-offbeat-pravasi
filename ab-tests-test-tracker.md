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
