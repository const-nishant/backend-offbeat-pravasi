# Implementation Plan — Feature Modules

> Detailed engineering plan for 10 feature modules, ordered Track A → B → C.
> **Track A (Foundation):** ✅ Itineraries, ✅ Policies, ✅ Gear, ✅ Weather, ✅ Safety, ✅ Assessments, ✅ Groups
> **Track B (Community):** Referrals
> **Track C (Retention):** Wishlist + Recommendations (combined)
>
> Builds on existing modules: bookings, payments, treks, users, bookmarks (retired), jobs.
> All new modules follow NestJS + TypeORM conventions already established in the codebase.

---

## Naming & Module Generation

Every new module follows the established NestJS convention. Use the NestJS CLI generator for each:

```bash
npx @nestjs/cli g module modules/<name>
npx @nestjs/cli g controller modules/<name>
npx @nestjs/cli g service modules/<name>
```

For each generated entity, `nest-cli.json` has the Swagger plugin enabled so decorators auto-document API schemas.

---

## ✅ Section 1 — Itinerary Management (`itineraries`) — **IMPLEMENTED**

> **Status:** Complete. PR: [#12](https://github.com/const-nishant/backend-offbeat-pravasi/pull/12)

### 1.1 Module overview
Creates `src/modules/itineraries/` with controller, service, module, entities. Enables organizers to build a day-by-day trek schedule. Each day: title, description, distance (km), altitude gain/loss (m), max altitude, meals, accommodation, activity type. Days are ordered and reorderable.

### 1.2 Entities

#### `ItineraryDay`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| trekId | uuid (FK → treks.id) | NOT NULL, indexed |
| dayNumber | int | NOT NULL, 1-based ordering |
| title | varchar(255) | e.g., "Summit Attempt" |
| description | text | Markdown-capable |
| distanceKm | double precision | Nullable |
| altitudeGainM | int | Nullable |
| altitudeLossM | int | Nullable |
| maxAltitudeM | int | Nullable |
| mealPlan | jsonb | Nullable — `{ breakfast, lunch, dinner }` |
| accommodationType | varchar(32) | Nullable — enum: TENT, GUESTHOUSE, CAMP, HOMESTAY |
| activityType | varchar(32) | NOT NULL — enum: TREKKING, REST, ACCLIMATIZATION, SIGHTSEEING |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

**Indexes:** `(trekId, dayNumber)` unique constraint — no two days can have the same number for the same trek.
**Relation:** ManyToOne → Trek. `@OneToMany(() => ItineraryDay, (d) => d.trek)` added on Trek entity.

### 1.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /treks/:trekId/itinerary | Public | Get full itinerary (ordered by dayNumber) |
| PUT | /treks/:trekId/itinerary | Organizer (own trek) | Bulk set/reorder all itinerary days |
| POST | /treks/:trekId/itinerary/days | Organizer (own trek) | Add a single day |
| PATCH | /treks/:trekId/itinerary/days/:dayId | Organizer (own trek) | Update a single day |
| DELETE | /treks/:trekId/itinerary/days/:dayId | Organizer (own trek) | Remove a day |
| PATCH | /treks/:trekId/itinerary/reorder | Organizer (own trek) | Reorder days (send ordered array of dayIds) |

### 1.4 DTOs

```typescript
// create-itinerary-day.dto.ts
class CreateItineraryDayDto {
  dayNumber: number;
  title: string;
  description?: string;
  distanceKm?: number;
  altitudeGainM?: number;
  altitudeLossM?: number;
  maxAltitudeM?: number;
  mealPlan?: { breakfast?: string; lunch?: string; dinner?: string };
  accommodationType?: AccommodationType;
  activityType: ActivityType;
}

// update-itinerary-day.dto.ts — same shape, all optional
// reorder-itinerary.dto.ts
class ReorderItineraryDto {
  dayIds: string[]; // ordered array of day IDs
}
```

### 1.5 Service design

```typescript
class ItinerariesService {
  async getByTrek(trekId: string): Promise<ItineraryDay[]>;
  async upsertDays(trekId: string, userId: string, days: CreateItineraryDayDto[]): Promise<ItineraryDay[]>;
  async addDay(trekId: string, userId: string, dto: CreateItineraryDayDto): Promise<ItineraryDay>;
  async updateDay(dayId: string, userId: string, dto: UpdateItineraryDayDto): Promise<ItineraryDay>;
  async deleteDay(dayId: string, userId: string): Promise<void>;
  async reorder(trekId: string, userId: string, dayIds: string[]): Promise<ItineraryDay[]>;
}
```

### 1.6 Queue/Worker needs
None. Pure CRUD. Offline-mode downloads will reference this data later (already planned in Track C).

### 1.7 Integration points
- **Trek entity** — `@OneToMany(() => ItineraryDay, (d) => d.trek) itineraryDays: ItineraryDay[]` added
- **Offline Mode (future)** — itinerary is primary download content
- **Weather module (future)** — each day's altitude enables day-specific forecasts
- **Safety module (future)** — itinerary context positions safety info per day

### 1.8 Migration
✅ `src/database/migrations/0016-CreateItineraryDaysTable.ts` — creates `itinerary_days` table with unique `(trekId, dayNumber)` constraint and rollback.

### 1.9 Task checklist (all ✅)
- [x] 1. Generate `itineraries` module
- [x] 2. Create `ItineraryDay` entity with all columns + indexes
- [x] 3. Create DTOs: `create-itinerary-day.dto.ts`, `update-itinerary-day.dto.ts`, `reorder-itinerary.dto.ts`
- [x] 4. Create `ItinerariesService` with all methods
- [x] 5. Create `ItinerariesController` with all routes
- [x] 6. Generate migration file and register in `ormconfig.ts`
- [x] 7. Update `Trek` entity with `itineraryDays` relation
- [x] 8. Register module in `app.module.ts`
- [x] 9. Write unit tests for service (12 tests)
- [x] 10. Write integration tests for endpoints (14 tests)

---

## ✅ Section 2 — Cancellation & Refund Policies (`policies`) — **IMPLEMENTED**

> **Status:** Complete. PR: [#13](https://github.com/const-nishant/backend-offbeat-pravasi/pull/13)

### 2.1 Module overview
Creates `src/modules/policies/`. Defines reusable cancellation policies (global + per-trek override). Each policy has tiers: cancellation windows (hours before start) mapped to refund percentages. Applies to booking cancellations. Refund processing hooks into existing payments module.

### 2.2 Entities

#### `CancellationPolicy`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| name | varchar(80) | e.g., "Flexible", "Standard", "Strict" |
| description | varchar(512) | Human-readable summary |
| isDefault | boolean | Default false — at most one default |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

#### `CancellationTier` (child of policy)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| policyId | uuid (FK → cancellation_policies.id) | NOT NULL, CASCADE delete |
| fromHoursBeforeStart | int | Start of window (e.g., 168 = 7 days) |
| toHoursBeforeStart | int | End of window (e.g., 72 = 3 days) — nullable for "or less" |
| refundPercentage | int | 0–100 |
| sortOrder | int | For display ordering |

**Indexes:** `(policyId, sortOrder)`. At most one tier with `toHoursBeforeStart IS NULL` per policy (the "no refund" tail).

#### `TrekPolicy` (link table)
| Column | Type | Notes |
|---|---|---|
| trekId | uuid (FK → treks.id, PK) | |
| policyId | uuid (FK → cancellation_policies.id) | NOT NULL |

One-to-one (each trek references exactly one policy). If no explicit link, use the current default policy.

#### `BookingPolicySnapshot` (immutable copy on Booking)
| Column | Type | Notes |
|---|---|---|
| bookingId | uuid (FK → bookings.id, PK) | Created at booking time |
| policyName | varchar(80) | Copied from policy at booking time |
| tiers | jsonb | Full tier array copied from policy at booking time — `[{ fromHours, toHours, refundPercentage }]` |
| createdAt | timestamptz | Auto |

**Why this exists:** If an admin modifies a cancellation policy after a user books, existing bookings must refund based on the policy *that was in effect when they booked*, not the current policy. Snapshotting the policy onto the booking at creation time makes `calculateRefund` deterministic and audit-proof. Matches the existing `trekSnapshot` pattern on the `Booking` entity.

### 2.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /admin/policies | Admin | List all policies (with tiers) |
| POST | /admin/policies | Admin | Create policy + tiers |
| PATCH | /admin/policies/:id | Admin | Update policy + tiers |
| DELETE | /admin/policies/:id | Admin | Delete policy |
| GET | /treks/:trekId/policy | Public | Get policy applicable to a trek |
| PUT | /treks/:trekId/policy | Admin/Organizer | Assign policy to trek |
| GET | /bookings/:bookingId/refund-estimate | Auth (owner) | Real-time refund amount based on policy + time |

### 2.4 DTOs

```typescript
// create-policy.dto.ts
class CreatePolicyDto {
  name: string;
  description?: string;
  isDefault: boolean;
  tiers: { fromHoursBeforeStart: number; toHoursBeforeStart?: number; refundPercentage: number; sortOrder: number }[];
}

// assign-policy.dto.ts
class AssignPolicyDto {
  policyId: string;
}
```

### 2.5 Service design

```typescript
class PolicyService {
  async getDefault(): Promise<CancellationPolicy>;
  async getForTrek(trekId: string): Promise<CancellationPolicy>;
  async assignToTrek(trekId: string, policyId: string): Promise<void>;
  async calculateRefund(trekId: string, bookingCreatedAt: Date, trekStartDate: Date): Promise<{ refundPercentage: number; refundAmount: number }>;
  // Admin CRUD
  async create(dto: CreatePolicyDto): Promise<CancellationPolicy>;
  async update(id: string, dto: Partial<CreatePolicyDto>): Promise<CancellationPolicy>;
  async delete(id: string): Promise<void>;
}
```

`calculateRefund` is the critical business method — used by the booking cancellation flow and the refund-estimate endpoint. It:
1. Looks up the `BookingPolicySnapshot` for this booking (created at booking time)
2. If snapshot exists, uses the snapshot's tiers; otherwise falls back to current policy for the trek (legacy safety net)
3. Computes hours remaining until trek start from `now`
4. Finds the matching tier in the (snapshot or current) tier list
5. Returns percentage + amount (from booking totalAmountInr)

**Policy snapshot creation:** When a booking is confirmed, the `BookingsService` must call `PolicyService.createSnapshot(bookingId, trekId)` which copies the current policy + tiers into `BookingPolicySnapshot`. This happens atomically within the booking transaction.

### 2.6 Queue/Worker needs
None. Refund processing uses the existing payment module's refund capabilities (synchronous via Stripe/Razorpay API). If async refund is needed later, a `refund-processor` queue can be added.

### 2.7 Integration points
- **Bookings module** — cancellation flow calls `policyService.calculateRefund()` before processing
- **Payments module** — refund amount sent to payment provider's refund API
- **Notifications module** — send cancellation + refund confirmation to both parties
- **Trek entity** — no column needed (policy link is in `TrekPolicy` table)

### 2.8 Migration
**Rollback:** `DROP TABLE IF EXISTS booking_policy_snapshots, trek_policies, cancellation_tiers, cancellation_policies CASCADE`.
One migration with seed data: `CREATE TABLE cancellation_policies`, `cancellation_tiers`, `trek_policies`, `booking_policy_snapshots` + seed a default "Standard" policy.

### 2.9 Task checklist (all ✅)
- [x] 1. Generate `policies` module
- [x] 2. Create `CancellationPolicy`, `CancellationTier`, `TrekPolicy`, `BookingPolicySnapshot` entities
- [x] 3. Create DTOs
- [x] 4. Create `PolicyService` (focus on `calculateRefund` as core logic — always check snapshot first)
- [x] 5. Create `PolicyController` (admin CRUD + public trek-policy lookups)
- [x] 6. Generate migration; seed default policy
- [x] 7. Register module in `app.module.ts`
- [x] 8. Modify `BookingsService.createBooking()` to call `policyService.createSnapshot()` after successful booking
- [x] 9. Modify `BookingsService.cancelBooking()` to use `policyService.calculateRefund()` with snapshot
- [x] 10. Wire refund amount into payments refund call
- [x] 11. Write unit + integration tests (critical: test policy-change-after-booking scenario)

---

## ✅ Section 3 — Equipment & Gear Checklists (`gear`) — **IMPLEMENTED**

> **Status:** Complete. PR: [#14](https://github.com/const-nishant/backend-offbeat-pravasi/pull/14)

### 3.1 Module overview
Creates `src/modules/gear/`. Per-trek gear lists with items organized by category. Items can be: required, recommended, provided-by-organizer, or available-for-rent (with price). Users can create personal packing checklists. Gear library is centrally managed.

### 3.2 Entities

#### `GearItem` (master library)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| name | varchar(255) | e.g., "Trekking Shoes" |
| category | varchar(32) | enum: CLOTHING, FOOTWEAR, CAMPING, NAVIGATION, TOILETRIES, DOCUMENTS, OPTIONAL |
| isActive | boolean | Default true — soft disable |

#### `TrekGearItem` (per-trek link)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| trekId | uuid (FK → treks.id) | CASCADE delete |
| gearItemId | uuid (FK → gear_items.id) | CASCADE delete |
| requirementType | varchar(16) | enum: REQUIRED, RECOMMENDED, PROVIDED, RENTAL |
| rentalPriceInr | int | Nullable — only for RENTAL type |
| notes | varchar(512) | Nullable — e.g., "Waterproof, ankle-high recommended" |
| sortOrder | int | Default 0 |

**Unique:** `(trekId, gearItemId)`.

#### `UserPackingListItem` (user's personal checklist)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | CASCADE delete |
| trekGearItemId | uuid (FK → trek_gear_items.id) | CASCADE delete |
| hasItem | boolean | Default false — user owns it |
| needsRental | boolean | Default false — user wants to rent |
| checked | boolean | Default false — packed for the trip |
| createdAt | timestamptz | Auto |

**Unique:** `(userId, trekGearItemId)`.

### 3.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /gear-items | Admin | List all master gear items |
| POST | /gear-items | Admin | Create master gear item |
| PUT | /gear-items/:id | Admin | Update master gear item |
| GET | /treks/:trekId/gear | Public | Get gear list for trek |
| PUT | /treks/:trekId/gear | Organizer (own trek) | Set gear list for trek (upsert bulk) |
| GET | /bookings/:bookingId/packing-list | Auth (booking owner) | Get user's packing list for this booking |
| PATCH | /bookings/:bookingId/packing-list/items/:itemId | Auth (booking owner) | Toggle hasItem / needsRental / checked |
| POST | /rentals/:bookingId | Auth (booking owner) | Confirm rental items — adds rental amount to booking total |

### 3.4 DTOs

```typescript
// create-gear-item.dto.ts
class CreateGearItemDto {
  name: string;
  category: GearCategory;
}

// set-trek-gear.dto.ts
class SetTrekGearDto {
  items: { gearItemId: string; requirementType: RequirementType; rentalPriceInr?: number; notes?: string }[];
}

// update-packing-item.dto.ts
class UpdatePackingItemDto {
  hasItem?: boolean;
  needsRental?: boolean;
  checked?: boolean;
}
```

### 3.5 Service design

```typescript
class GearService {
  // Master gear
  async getAllGearItems(): Promise<GearItem[]>;
  async createGearItem(dto: CreateGearItemDto): Promise<GearItem>;
  async updateGearItem(id: string, dto: Partial<CreateGearItemDto>): Promise<GearItem>;

  // Per-trek gear
  async getTrekGear(trekId: string): Promise<TrekGearItem[]>;
  async setTrekGear(trekId: string, userId: string, dto: SetTrekGearDto): Promise<TrekGearItem[]>;

  // User packing list
  async getPackingList(bookingId: string, userId: string): Promise<UserPackingListItem[]>;
  async updatePackingItem(bookingId: string, itemId: string, userId: string, dto: UpdatePackingItemDto): Promise<UserPackingListItem>;

  // Rentals
  async confirmRentals(bookingId: string, userId: string): Promise<{ addedCost: number }>;
}
```

### 3.6 Queue/Worker needs
A scheduled job `packing-reminder.processor.ts` — sends push notification 3 days before trek start to users who haven't marked all packing items as checked. Reuses existing `notifications` module.

**Rental guard:** The `POST /rentals/:bookingId` endpoint must reject requests if the booking status is `CONFIRMED` or `PAID`. Rentals can only be added/modified while the booking is in `PENDING` status. This prevents the "booking already paid but rental costs added after" problem. If a user needs to add rentals after payment, they must go through a separate "add-on purchase" flow (future scope — v2).

### 3.7 Integration points
- **Trek entity** — add `@OneToMany(() => TrekGearItem, ...)` relation
- **Bookings module** — rental costs added to booking total at checkout
- **Notifications module** — pre-trek packing reminders
- **Marketplace (future)** — gear items link to marketplace search
- **Offline Mode (future)** — packing list is a core offline download

### 3.8 Migration
Two migrations: (1) `CREATE TABLE gear_items` with seed data for ~40 common items, (2) `CREATE TABLE trek_gear_items` and `user_packing_list_items`.

### 3.9 Task checklist (all ✅)
- [x] 1. Generate `gear` module
- [x] 2. Create `GearItem`, `TrekGearItem`, `UserPackingListItem` entities
- [x] 3. Create DTOs
- [x] 4. Create `GearService`
- [x] 5. Create `GearController`
- [x] 6. Seed gear library (~40 items across 7 categories)
- [x] 7. Generate migrations
- [x] 8. Register module in `app.module.ts`
- [x] 9. Add `packing-reminder` BullMQ processor
- [x] 10. Write tests

---

## ✅ Section 4 — Weather Integration (`weather`) — **IMPLEMENTED**
> **Status:** Complete. PR: [#15](https://github.com/const-nishant/backend-offbeat-pravasi/pull/15)

### 4.1 Module overview
Creates `src/modules/weather/`. Fetches live weather forecasts for trek locations (lat/lng) via a third-party API. Caches aggressively in Redis. Shows current conditions, hourly breakdown, and 7-day forecast. No DB entities — all data is transient forecast data.

### 4.2 Data model (no entity)
Weather data is fetched and cached. The response shape (cached in Redis):

```typescript
interface TrekWeather {
  location: { lat: number; lng: number; name: string };
  current: {
    temperatureC: number;
    feelsLikeC: number;
    condition: 'clear' | 'partly_cloudy' | 'cloudy' | 'rain' | 'heavy_rain' | 'snow' | 'storm';
    windSpeedKmph: number;
    humidityPercent: number;
    sunrise: string;
    sunset: string;
  };
  hourly: Array<{ time: string; temperatureC: number; condition: string; precipitationPercent: number }>;
  days: Array<{ date: string; highC: number; lowC: number; condition: string; precipitationPercent: number }>;
  fetchedAt: string; // ISO timestamp
  source: string;    // API provider name
}
```

### 4.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /treks/:trekId/weather | Public | Get weather for trek location (defaults to current + 7-day) |
| GET | /treks/:trekId/weather?date=2026-09-15&date=2026-09-20 | Public | Weather for specific dates |

### 4.4 Service design

```typescript
class WeatherService {
  private weatherApi: WeatherApiProvider; // Adapter pattern

  async getForTrek(trekId: string, dates?: Date[]): Promise<TrekWeather>;
  async getForCoordinates(lat: number, lng: number, dates?: Date[]): Promise<TrekWeather>;

  private async fetchFromProvider(lat: number, lng: number, dates?: Date[]): Promise<TrekWeather>;
  private cacheKey(trekId: string, datesKey: string): string; // returns "weather:trek:<id>:<dateHash>"
  private getCached(key: string): Promise<TrekWeather | null>;
  private setCache(key: string, data: TrekWeather, ttlSeconds: number): Promise<void>;
}
```

**Cache strategy:**
- Current conditions: 30 min TTL
- 7-day forecast: 2 hour TTL
- Historical/date-specific: 6 hour TTL (less frequently accessed)

### 4.5 Weather API provider
Create a provider adapter (`weather-provider.interface.ts`):

```typescript
interface WeatherProvider {
  fetch(lat: number, lng: number, options?: WeatherOptions): Promise<WeatherApiResponse>;
}
```

Implement with **OpenWeatherMap** or **WeatherAPI.com** as the first provider. The `.env` gets:
```
WEATHER_API_KEY=xxx
WEATHER_API_BASE_URL=https://api.weatherapi.com/v1
```

**Important:** The weather provider must NOT be called on every page load. Controller → Service first checks Redis cache. Only cache misses call the external API.

### 4.6 Queue/Worker needs
A recurring BullMQ job `weather-prefetch.processor.ts` that runs every 3 hours:
1. Queries all treks with upcoming start dates (next 14 days)
2. Pre-fetches and caches weather for each
3. If severe weather detected (storm warning, extreme temp), publishes a notification event

### 4.7 Integration points
- **Notifications module** — severe weather alerts + pre-trek weather push notifications (3 days before)
- **Safety module** — weather data feeds into safety advisory system
- **Recommendations module** — weather windows influence trek suggestions
- **Gear module** — weather data can trigger gear suggestions: "Rain expected → bring rain cover"

### 4.8 DTOs

```typescript
// weather-query.dto.ts
class WeatherQueryDto {
  @IsOptional()
  @IsArray()
  @IsDateString({ each: true })
  dates?: string[]; // Filter to specific dates
}
```

### 4.9 Migration
None — no database persistence for weather.

### 4.10 Task checklist
- [x] 1. Generate `weather` module
- [x] 2. Create `WeatherProvider` interface + adapter factory
- [x] 3. Implement first provider (OpenWeatherMap / WeatherAPI.com)
- [x] 4. Create `WeatherService` with Redis caching logic
- [x] 5. Create `WeatherController` with 1 endpoint
- [x] 6. Create `WeatherQueryDto`
- [x] 7. Create weather-prefetch BullMQ processor + register in `queues.ts`
- [x] 8. Add WEATHER_API_KEY to `.env.example` + configuration
- [x] 9. Register module in `app.module.ts`
- [x] 10. Write unit tests (mock provider, test caching)

---

## ✅ Section 5 — Emergency & Safety (`safety`) — **IMPLEMENTED**

> **Status:** Complete.

### 5.1 Module overview
Creates `src/modules/safety/`. Per-trek safety guidelines, emergency contacts, and a check-in/check-out system. Missed check-out triggers escalation (push → SMS to emergency contact).

### 5.2 Entities

#### `TrekSafetyInfo`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| trekId | uuid (FK → treks.id) | UNIQUE — one per trek |
| terrainRisks | text | Markdown — steep sections, loose rocks, etc. |
| altitudeWarnings | text | Nullable — AMS symptoms, max altitude |
| wildlifeAdvisories | text | Nullable |
| generalGuidelines | text | Nullable — "stay on trail, carry 2L water" |
| baseCampContact | varchar(32) | Nullable — phone |
| localRescueContact | varchar(32) | Nullable |
| nearestHospital | varchar(255) | Nullable — name + GPS coordinates |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

#### `UserEmergencyContact`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | CASCADE delete |
| name | varchar(120) | |
| phone | varchar(20) | |
| relationship | varchar(40) | e.g., "Mother", "Spouse", "Friend" |
| isPrimary | boolean | Default false — at most one primary |
| createdAt | timestamptz | Auto |

**Index:** `(userId)`.

#### `TrekCheckIn`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| bookingId | uuid (FK → bookings.id) | UNIQUE — one check-in per booking |
| userId | uuid (FK → users.id) | Indexed |
| checkedInAt | timestamptz | NOT NULL |
| checkInLocation | geometry(Point, 4326) | Captured GPS at check-in |
| expectedCheckOutAt | timestamptz | NOT NULL — trek end time |
| checkedOutAt | timestamptz | Nullable |
| checkOutLocation | geometry(Point, 4326) | Nullable |
| status | varchar(16) | DEFAULT 'ACTIVE' — enum: ACTIVE, COMPLETED, ESCALATED, RESOLVED |
| escalatedAt | timestamptz | Nullable |
| resolvedAt | timestamptz | Nullable |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

**Index:** `(status, expectedCheckOutAt)` — for the missed-checkout scanner job.

### 5.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /treks/:trekId/safety | Public | Get safety info for a trek |
| PUT | /treks/:trekId/safety | Organizer (own trek) | Upsert safety info |
| GET | /profile/emergency-contacts | Auth | List user's emergency contacts |
| POST | /profile/emergency-contacts | Auth | Add emergency contact |
| PATCH | /profile/emergency-contacts/:id | Auth | Update emergency contact |
| DELETE | /profile/emergency-contacts/:id | Auth | Delete emergency contact |
| POST | /bookings/:bookingId/check-in | Auth (booking owner) | Check in to trek |
| POST | /bookings/:bookingId/check-out | Auth (booking owner) | Check out from trek |
| GET | /bookings/:bookingId/check-in-status | Auth (booking owner) | Get check-in/check-out status |
| POST | /check-in/:checkInId/acknowledge | Auth (booking owner) | User acknowledges they're safe — cancels pending escalation jobs, sends "resolved" to emergency contact |

### 5.4 DTOs

```typescript
// upsert-safety-info.dto.ts
class UpsertSafetyInfoDto {
  terrainRisks?: string;
  altitudeWarnings?: string;
  wildlifeAdvisories?: string;
  generalGuidelines?: string;
  baseCampContact?: string;
  localRescueContact?: string;
  nearestHospital?: string;
}

// create-emergency-contact.dto.ts
class CreateEmergencyContactDto {
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
}
```

### 5.5 Service design

```typescript
class SafetyService {
  // Trek safety info
  async getTrekSafety(trekId: string): Promise<TrekSafetyInfo | null>;
  async upsertTrekSafety(trekId: string, userId: string, dto: UpsertSafetyInfoDto): Promise<TrekSafetyInfo>;

  // Emergency contacts
  async getUserContacts(userId: string): Promise<UserEmergencyContact[]>;
  async addContact(userId: string, dto: CreateEmergencyContactDto): Promise<UserEmergencyContact>;
  async updateContact(contactId: string, userId: string, dto: Partial<CreateEmergencyContactDto>): Promise<UserEmergencyContact>;
  async deleteContact(contactId: string, userId: string): Promise<void>;
  async getPrimaryContact(userId: string): Promise<UserEmergencyContact | null>;

  // Check-in/out
  async checkIn(bookingId: string, userId: string, location: Point): Promise<TrekCheckIn>;
  async checkOut(bookingId: string, userId: string, location: Point): Promise<TrekCheckIn>;
  async getCheckInStatus(bookingId: string, userId: string): Promise<TrekCheckIn>;

  // Escalation (called by worker)
  async escalateMissedCheckout(checkInId: string): Promise<void>;
  async resolveEscalation(checkInId: string): Promise<void>;
}
```

### 5.6 Queue/Worker needs

The check-in/out system uses **delayed BullMQ jobs** per check-in (not polling), so every escalation has a deterministic trigger time and a full audit trail.

**Check-in flow with delayed jobs:**
1. User calls `POST /bookings/:bookingId/check-in`
2. System creates `TrekCheckIn` record with `status = 'ACTIVE'`
3. System schedules a BullMQ **delayed job** `checkin-escalation-first-warning` at `expectedCheckOutAt + 2 hours` with job data: `{ checkInId, bookingId, userId }`
4. System schedules a second BullMQ **delayed job** `checkin-escalation-emergency` at `expectedCheckOutAt + 2 hours + 30 minutes` with same data

**Check-out flow:**
1. User calls `POST /bookings/:bookingId/check-out`
2. System updates `TrekCheckIn.status = 'COMPLETED'`, sets `checkedOutAt`
3. System **removes** both pending delayed jobs by their job IDs (BullMQ `job.remove()`)
4. Emergency contact receives "completed successfully" notification

**First warning job (`checkin-escalation-first-warning`):**
- When fired: sends push notification to user — "You haven't checked out from [Trek Name]. Everything okay? Tap to confirm you're safe."
- If user responds via `POST /check-in/:checkInId/acknowledge` within the next 30 minutes, the emergency job is removed

**Emergency job (`checkin-escalation-emergency`):**
- When fired: checks if status is still `ACTIVE` or `ESCALATED`
- If user acknowledged: does nothing
- If still missing: sends SMS to primary emergency contact: "[Name] hasn't checked out from [Trek Name]. Last known location: [GPS]. Contact organizer at [number]."
- Updates `TrekCheckIn.status = 'ESCALATED'` and `escalatedAt`

**Acknowledge endpoint:** `POST /check-in/:checkInId/acknowledge` — user taps "I'm safe" in the push notification. Updates `status = RESOLVED`, removes any pending escalation jobs, sends "resolved" notification to emergency contact.

**SMS fallback:** The `notifications` module already has push capabilities. An SMS provider (Twilio or similar) may need to be added if not already present. Fall back to email if SMS is unavailable.

**Why delayed jobs instead of polling:** (1) Bounded latency — escalation fires at exactly `expectedCheckOutAt + 2h`, not up to `+2h15m`. (2) Per-check-in audit trail — each job has a unique ID, can be inspected in BullMQ dashboard, and has automatic retry on failure. (3) No risk of silent worker death — if the worker pod goes down, BullMQ re-queues unacknowledged jobs to another worker. (4) No timestamp drift — the comparison is against the job's scheduled fire time, not `NOW() - INTERVAL` which can drift if the job queue backs up.

### 5.7 Integration points
- **Notifications module** — push notifications for missed check-out, SMS/email to emergency contacts
- **Weather module** — severe weather triggers early safety alerts
- **Groups module (future)** — group leader checks in/out for all members
- **Buddy Matching (future)** — solo trekkers matched with buddies have built-in safety pair

### 5.8 Migration
One migration: `CREATE TABLE trek_safety_info`, `user_emergency_contacts`, `trek_check_ins`.

### 5.9 Task checklist (all ✅)
- [x] 1. Generate `safety` module
- [x] 2. Create `TrekSafetyInfo`, `UserEmergencyContact`, `TrekCheckIn` entities
- [x] 3. Create DTOs (including `AcknowledgeSafetyDto`)
- [x] 4. Create `SafetyService` with check-in/out, acknowledge, and escalation logic
- [x] 5. Create `SafetyController` (add `POST /check-in/:checkInId/acknowledge`)
- [x] 6. Generate migration with rollback
- [x] 7. Create two BullMQ job processors: `checkin-first-warning` and `checkin-emergency` — both triggered as delayed jobs per check-in, not as recurring jobs
- [x] 8. Wire SMS/email fallback for emergency notifications (logged with contact details; Twilio integration deferred)
- [x] 9. Register module in `app.module.ts`
- [x] 10. Write tests — 136 tests across 4 test suites (unit: service 38, controller 12; QA edge cases: 12 focus areas; integration: SQLite full lifecycle)

---

## ✅ Section 6 — Fitness Assessment Quiz (`assessments`) — **IMPLEMENTED**

> **Status:** Complete.

### 6.1 Module overview
Creates `src/modules/assessments/`. An 8–12 question multiple-choice quiz that evaluates fitness level, trekking experience, altitude comfort, medical history, and preferences. Returns a difficulty bracket score. Users can retake anytime. Score feeds recommendations.

### 6.2 Entities

#### `FitnessAssessment`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | Indexed |
| totalScore | int | 0–100 computed score |
| difficultyBracket | varchar(16) | enum: EASY, MODERATE, DIFFICULT, EXTREME |
| answers | jsonb | Full Q&A payload |
| completedAt | timestamptz | |
| createdAt | timestamptz | Auto |

**Index:** `(userId, completedAt DESC)` — for fetching latest result.

**Question bank** is stored in code / config (not a DB entity for v1):

```typescript
const QUIZ_QUESTIONS = [
  {
    id: 'exercise_frequency',
    question: 'How often do you exercise?',
    options: [
      { label: 'Never', score: 0 },
      { label: '1-2x week', score: 25 },
      { label: '3-5x week', score: 50 },
      { label: 'Daily', score: 100 },
    ],
    weight: 1.5,
  },
  // ... 7–11 more questions covering: longest walk, altitude experience,
  // camping comfort, medical conditions (boolean, high weight),
  // primary goal, age range, prior trek count
];
```

**Scoring logic:**
1. Each answer gives a score (0–100)
2. Multiply by question `weight`
3. Sum and normalize to 0–100
4. Map to bracket: 0–20 → EASY, 21–45 → MODERATE, 46–75 → DIFFICULT, 76–100 → EXTREME

### 6.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /assessments/questions | Public | Get quiz questions + options |
| POST | /assessments/submit | Auth | Submit quiz answers → get score + bracket |
| GET | /assessments/my-result | Auth | Get latest assessment result |
| GET | /users/:userId/assessment-result | Public | Get a user's public assessment bracket |

### 6.4 DTOs

```typescript
// submit-assessment.dto.ts
class SubmitAssessmentDto {
  answers: { questionId: string; selectedOption: string }[];
}

// assessment-result.dto.ts (response)
class AssessmentResultDto {
  totalScore: number;
  difficultyBracket: DifficultyBracket;
  recommendedDifficultyLabel: string;
  completedAt: Date;
}
```

### 6.5 Service design

```typescript
class AssessmentService {
  async getQuestions(): Promise<QuizQuestion[]>;
  async submit(userId: string, dto: SubmitAssessmentDto): Promise<FitnessAssessment>;
  async getLatestResult(userId: string): Promise<FitnessAssessment | null>;
  async getUserBracket(userId: string): Promise<DifficultyBracket | null>;
  async getPublicResult(userId: string): Promise<{ difficultyBracket: DifficultyBracket | null }>;
}
```

### 6.6 Queue/Worker needs
None. Pure CRUD + compute.

### 6.7 Integration points
- **Recommendations module** — `difficultyBracket` filters and prioritizes recommended treks
- **Safety module** — low fitness scorers get additional safety guidance on trek pages
- **Groups module (future)** — group members' fitness levels visible to leader

### 6.8 Migration
One migration: `CREATE TABLE fitness_assessments`.

After assessment, the user's `userPoints` on the User entity should increment (rebuild the `bookmarks` module approach — add assessment points to `User.userPoints`).

### 6.9 Task checklist (all ✅)
- [x] 1. Generate `assessments` module
- [x] 2. Define question bank in a constants/config file (10 questions with weights)
- [x] 3. Create `FitnessAssessment` entity with composite index `(userId, completedAt DESC)`
- [x] 4. Create DTOs (`SubmitAssessmentDto`, `AssessmentResultDto`, `PublicBracketDto`)
- [x] 5. Implement scoring algorithm in `AssessmentService` (weighted normalization 0–100)
- [x] 6. Create `AssessmentController` with 4 endpoints (2 public, 2 auth)
- [x] 7. Generate migration `0020-CreateFitnessAssessmentsTable.ts`
- [x] 8. Register module in `app.module.ts` + entity in `ormconfig.ts`
- [x] 9. Write tests — 70 tests across 5 suites (unit: service 8, controller 5; QA edge cases: 12; senior QA review: 37; integration: 8)

---

## ✅ Section 7 — Group Bookings (`groups`) — **IMPLEMENTED**

> **Status:** Complete.

### 7.1 Module overview
Creates `src/modules/groups/`. One lead booker creates a group, invites members, tracks status (invited/joined/declined), and places a single booking for all members. Each member fills individual details. Lead booker pays once.

### 7.2 Entities

#### `TrekGroup`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| trekId | uuid (FK → treks.id) | |
| leadUserId | uuid (FK → users.id) | The creator/lead booker |
| name | varchar(120) | e.g., "Chadar Crew 2026" |
| maxSize | int | |
| expiresAt | timestamptz | Auto-cancels if not booked by this date |
| status | varchar(16) | enum: OPEN, BOOKED, EXPIRED, CANCELLED |
| shareCode | varchar(12) | Unique, short — for invite links |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

**Index:** `(shareCode)` UNIQUE, `(trekId, status)`.

#### `GroupMember`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| groupId | uuid (FK → trek_groups.id) | CASCADE delete |
| userId | uuid (FK → users.id) | Nullable — set when user accepts |
| email | varchar(120) | For invited users not yet registered |
| status | varchar(16) | enum: INVITED, JOINED, DECLINED |
| fullName | varchar(80) | Nullable — filled on join |
| phone | varchar(20) | Nullable |
| emergencyContact | jsonb | Nullable — { name, phone, relationship } |
| medicalConditions | text | Nullable |
| joinedAt | timestamptz | Nullable |
| createdAt | timestamptz | Auto |

**Unique:** `(groupId, userId)` where userId is not null.

### 7.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /groups | Auth | Create new trek group |
| GET | /groups/:id | Auth (lead/member) | Get group details + members |
| PATCH | /groups/:id | Auth (lead) | Update group name, maxSize, expiresAt |
| POST | /groups/:id/invite | Auth (lead) | Invite members (email or userId) |
| POST | /groups/join/:shareCode | Auth | Join a group via share code |
| PATCH | /groups/:id/members/:memberId/status | Auth (member) | Accept/decline invitation |
| DELETE | /groups/:id/members/:memberId | Auth (lead) | Remove a member |
| POST | /groups/:id/book | Auth (lead) | Book for all joined members → creates booking |
| DELETE | /groups/:id | Auth (lead) | Cancel group |

### 7.4 DTOs

```typescript
// create-group.dto.ts
class CreateGroupDto {
  trekId: string;
  name?: string;
  maxSize: number;
  expiresAt: Date;
}

// invite-members.dto.ts
class InviteMembersDto {
  invites: ({ userId: string } | { email: string })[];
  // Members with userId already have accounts; email triggers registration flow
}

// update-member-status.dto.ts
class UpdateMemberStatusDto {
  status: 'JOINED' | 'DECLINED';
  fullName?: string;
  phone?: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
  medicalConditions?: string;
}
```

### 7.5 Service design

```typescript
class GroupService {
  async create(userId: string, dto: CreateGroupDto): Promise<TrekGroup>;
  async getById(groupId: string): Promise<TrekGroup & { members: GroupMember[] }>;
  async update(groupId: string, userId: string, dto: Partial<CreateGroupDto>): Promise<TrekGroup>;
  async invite(groupId: string, userId: string, dto: InviteMembersDto): Promise<void>;
  async join(shareCode: string, userId: string): Promise<GroupMember>;
  async updateMemberStatus(groupId: string, memberId: string, userId: string, dto: UpdateMemberStatusDto): Promise<GroupMember>;
  async removeMember(groupId: string, memberId: string, userId: string): Promise<void>;
  async bookForGroup(groupId: string, userId: string): Promise<Booking>;
  async cancel(groupId: string, userId: string): Promise<void>;
  async expireStaleGroups(): Promise<void>; // Called by cron
}
```

**Booking logic** in `bookForGroup` — **must run in a database transaction with pessimistic locking**:

1. Begin transaction (TypeORM `QueryRunner`)
2. Verify lead user = group lead
3. Verify all members have status = JOINED
4. Verify group has not expired
5. `SELECT trek.currentParticipants, trek.maxParticipants FROM treks WHERE id = :trekId FOR UPDATE` — locks the trek row against concurrent modifications
6. Verify `currentParticipants + groupMemberCount <= maxParticipants`
7. Call `BookingsService.create()` within the same transaction with participants array = all group member details
8. Set booking `quantity` = number of members, `unitPriceInr` = standard trek price per person (group discounts deferred to Coupons module), `totalAmountInr` = `quantity * unitPriceInr`
9. Increment `trek.currentParticipants` by group member count
10. Commit transaction
11. Update group `status = BOOKED`

**Why this matters:** Without `SELECT FOR UPDATE`, two concurrent `bookForGroup` calls for the same trek can both pass the capacity check (step 6) and overbook the trek. The lock ensures only one transaction at a time can modify trek capacity.

### 7.6 Queue/Worker needs

**`group-expiry.processor.ts`** — recurring BullMQ job (runs hourly):
1. Query `TrekGroup` where `status = 'OPEN' AND expiresAt < NOW()`
2. Mark as EXPIRED
3. Send notifications to all members

**`group-reminder.processor.ts`** — runs daily, sends push to groups that are 48h from expiry with pending members.

### 7.7 Integration points
- **Bookings module** — `bookForGroup` calls booking creation with participant details
- **Payments module** — single payment for all members
- **Notifications module** — invite, join, booking confirmation, expiry warnings
- **Safety module** — group check-in (lead checks in for all)
- **Buddy Matching (future)** — solo trekkers can discover open groups

### 7.8 Migration
One migration: `CREATE TABLE trek_groups` and `group_members`.

### 7.9 Task checklist (all ✅)
- [x] 1. Generate `groups` module
- [x] 2. Create `TrekGroup`, `GroupMember` entities
- [x] 3. Create DTOs
- [x] 4. Create `GroupService` — focus on `bookForGroup` (most complex — uses pessimistic lock via `QueryRunner`)
- [x] 5. Create `GroupController`
- [x] 6. Generate migration `0021-CreateGroupTables.ts`
- [x] 7. Create `group-expiry` BullMQ processor + scheduler (hourly)
- [x] 8. Register module in `app.module.ts`, entity in `ormconfig.ts`, queue in `queues.ts`, job in `jobs.module.ts`
- [x] 9. Extend `NotificationType` with `GROUP_INVITE`, `GROUP_UPDATE`
- [x] 10. Write tests — 81 tests across 3 suites (service: 20, controller: 8, senior QA: 53)

---

## Section 8 — Referral Program (`referrals`)

### 8.1 Module overview
Creates `src/modules/referrals/`. Every user gets a unique referral code. Referrers earn rewards when referred users complete a booking. Rewards: coupons, loyalty points, or both. Tiered bonuses for volume referrers.

### 8.2 Entities

#### `ReferralCode`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | UNIQUE — one code per user |
| code | varchar(20) | UNIQUE — alphanumeric, e.g., "RAHUL25" |
| tier | varchar(16) | enum: BASE, SILVER, GOLD — based on referral count |
| totalReferrals | int | Default 0 |
| successfulReferrals | int | Default 0 (referee completed a trek) |
| totalEarnedInr | int | Default 0 — cumulative reward value |
| createdAt | timestamptz | Auto |

**Index:** `(code)` UNIQUE.

#### `Referral`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| referrerCodeId | uuid (FK → referral_codes.id) | |
| refereeUserId | uuid (FK → users.id) | Nullable — set when referee signs up |
| refereeEmail | varchar(120) | Captured at referral time |
| status | varchar(16) | enum: PENDING, BOOKED, COMPLETED, REWARDED |
| rewardType | varchar(16) | enum: COUPON, POINTS, BOTH |
| rewardValueInr | int | |
| rewardDeliveredAt | timestamptz | Nullable |
| createdAt | timestamptz | Auto |

**Unique:** `(referrerCodeId, refereeEmail)` — one referral per email per referrer.

#### `ReferralTierConfig` (seeded config, not per-user)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| tier | varchar(16) | UNIQUE: BASE, SILVER, GOLD |
| minSuccessfulReferrals | int | |
| rewardPerReferralInr | int | |
| refereeDiscountInr | int | |

### 8.3 API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /referrals/my-code | Auth | Get own referral code + stats |
| POST | /referrals/generate | Auth | Generate/fetch referral code |
| GET | /referrals/my-referrals | Auth | List all referrals made (paginated) |
| GET | /referrals/leaderboard | Public | Top referrers |
| GET | /referrals/claim/:code | Public | Landing page — shows referral info, prompts sign-up |

### 8.4 DTOs

```typescript
// claim-referral.dto.ts
class ClaimReferralDto {
  code: string;
  // On sign-up flow, referral code is captured
}

// referral-response.dto.ts
class ReferralCodeResponseDto {
  code: string;
  shareLink: string; // e.g., offbeatpravasi.com/r/RAHUL25
  tier: string;
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnedInr: number;
}
```

### 8.5 Service design

```typescript
class ReferralService {
  async getOrGenerateCode(userId: string): Promise<ReferralCode>;
  async getMyReferrals(userId: string, page: number, limit: number): Promise<PaginatedResult<Referral>>;
  async getCodeInfo(code: string): Promise<{ referrerName: string; discountAmount: number }>;
  async claimReferral(code: string, refereeUserId: string): Promise<void>;
  // Called by bookings service after successful booking
  async onBookingCompleted(referralId: string): Promise<void>;
  // Called by bookings/ticket.pdf to deliver reward
  async deliverReward(referralId: string): Promise<void>;
  async recalculateTier(userId: string): Promise<void>;
  async getLeaderboard(limit: number): Promise<{ userId: string; name: string; successfulReferrals: number }[]>;
}
```

**Referral flow:**
1. User shares link `offbeatpravasi.com/r/RAHUL25`
2. New user clicks link → `GET /referrals/claim/RAHUL25` → shows "You were referred by Rahul! Get ₹500 off your first trek!"
3. New user signs up with email captured from the referral
4. On sign-up, `ReferralService.claimReferral(code, newUserId)` is called
5. After first booking is completed (status = CONFIRMED), a BullMQ job triggers `deliverReward`
6. Reward is delivered as a coupon via the Coupons module (when built) or as loyalty points added to `User.userPoints`

### 8.6 Queue/Worker needs

**`referral-reward-delivery.processor.ts`** — triggered when a referred user's booking becomes CONFIRMED:
1. Look up the `Referral` record via `refereeUserId`
2. Create a coupon or add loyalty points
3. Update `Referral.status = REWARDED`
4. Update `ReferralCode.successfulReferrals++`
5. Check if referrer qualifies for tier upgrade → `recalculateTier`
6. Send notification to referrer and referee

### 8.7 Integration points
- **Users module** — on sign-up flow, pass referral code from query param → `claimReferral`
- **Bookings module** — on booking confirmation, emit event for referral reward delivery
- **Coupons module (when built)** — reward delivery creates discount coupons
- **Rewards module (when built)** — points-based reward delivery
- **Notifications module** — milestone notifications: "You earned a referral reward!"

### 8.8 Migration
One migration: `CREATE TABLE referral_codes`, `referrals`, `referral_tier_config` + seed tier config.

### 8.9 Task checklist
1. Generate `referrals` module
2. Create `ReferralCode`, `Referral`, `ReferralTierConfig` entities
3. Create DTOs
4. Create `ReferralService`
5. Create `ReferralController`
6. Generate migration with tier config seed data
7. Create `referral-reward-delivery` BullMQ processor
8. Register module in `app.module.ts`
9. Wire into sign-up flow (capture referral code from query params)
10. Wire into booking confirmation flow (trigger reward delivery)
11. Write tests

---

## Section 9 — Wishlist + Recommendations (`wishlist` + `recommendations`)

### 9.1 Module overview
Creates two modules: `src/modules/wishlist/` and `src/modules/recommendations/`.

**Wishlist:** Users save treks to personal collections with notes, tags, priority. Smart alerts on price drops, availability, seasonal prompts. Replaces the existing `Bookmarks` module.

**Recommendations:** Personalized trek suggestions based on completed treks, wishlist, fitness score, browsing behaviour, seasonal context, and community patterns. Existing tag-similarity system in Redis is replaced by a DB-backed engine.

### 9.2 Entities (Wishlist)

#### `WishlistCollection`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | CASCADE delete |
| name | varchar(120) | e.g., "Monsoon Plans", "Bucket List" |
| description | varchar(512) | Nullable |
| sortOrder | int | Default 0 |
| createdAt | timestamptz | Auto |
| updatedAt | timestamptz | Auto |

**Unique:** `(userId, name)` — no duplicate collection names per user.

#### `WishlistItem`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| collectionId | uuid (FK → wishlist_collections.id) | CASCADE delete |
| trekId | uuid (FK → treks.id) | CASCADE delete |
| notes | varchar(512) | Nullable — user's personal note |
| priority | int | Default 0 — 0=normal, 1=high, 2=top |
| sortOrder | int | Default 0 |
| addedAt | timestamptz | Auto |

**Unique:** `(collectionId, trekId)`.

### 9.3 Entities (Recommendations)

#### `UserRecommendationPreference`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | UNIQUE |
| preferredDifficulty | varchar(16)[] | Array of difficulty enums |
| preferredStates | varchar(80)[] | Array of state names |
| maxBudget | int | Nullable |
| preferredDurationDays | int[] | Array: [min, max] |
| interests | jsonb | Array of tag IDs |
| updatedAt | timestamptz | Auto |

#### `RecommendationResult` (cached recommendations)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | Indexed |
| trekId | uuid (FK → treks.id) | |
| score | float | 0.0–1.0 relevance score |
| reason | varchar(32) | enum: COMPLETED_SIMILAR, WISHLIST_SIMILAR, FITNESS_MATCH, SEASONAL, POPULAR, NEW_REGION |
| expiresAt | timestamptz | TTL |
| createdAt | timestamptz | Auto |

**Index:** `(userId, score DESC)`.

#### `RecommendationEvent` (conversion tracking — instrumentation)
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| userId | uuid (FK → users.id) | |
| recommendationResultId | uuid (FK → recommendation_results.id) | Nullable — which recommendation was served |
| trekId | uuid (FK → treks.id) | |
| eventType | varchar(32) | enum: SERVED, CLICKED, BOOKED |
| score | float | Nullable — recommendation score at time of serving |
| reason | varchar(32) | Nullable — reason at time of serving |
| createdAt | timestamptz | Auto |

**Index:** `(userId, eventType, createdAt)`, `(trekId, eventType)`.

**Why this exists:** Without conversion tracking, there is no way to know if the recommendation engine is working. Every time a recommendation is served, a `SERVED` event is logged. If the user clicks it: `CLICKED`. If they book: `BOOKED`. This data feeds into analytics dashboards and enables A/B testing of weight configurations. The `PlatformSettings` weights can be tuned based on actual conversion rates.

### 9.4 API endpoints (Wishlist)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /wishlist/collections | Auth | List user's wishlist collections |
| POST | /wishlist/collections | Auth | Create a collection |
| PATCH | /wishlist/collections/:id | Auth | Rename/reorder collection |
| DELETE | /wishlist/collections/:id | Auth | Delete collection + its items |
| GET | /wishlist/collections/:id/items | Auth | List items in a collection |
| POST | /wishlist/collections/:id/items | Auth | Add trek to collection |
| PATCH | /wishlist/items/:id | Auth | Update notes/priority |
| DELETE | /wishlist/items/:id | Auth | Remove from wishlist |
| POST | /wishlist/quick-add/:trekId | Auth | One-tap add to default collection |
| GET | /wishlist/shared/:shareToken | Public | View a shared wishlist |

### 9.5 API endpoints (Recommendations)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /recommendations | Auth | Get personalized recommendations (top 10) |
| GET | /recommendations/refresh | Auth | Force refresh recommendations |
| GET | /treks/:trekId/recommendations | Public | "Similar treks" for a specific trek (collaborative) |
| PUT | /recommendations/preferences | Auth | Set recommendation preferences |

### 9.6 DTOs

```typescript
// create-collection.dto.ts
class CreateCollectionDto {
  name: string;
  description?: string;
}

// add-to-collection.dto.ts
class AddToCollectionDto {
  trekId: string;
  notes?: string;
  priority?: number;
}

// recommendation-preference.dto.ts
class RecommendationPreferenceDto {
  preferredDifficulty?: DifficultyBracket[];
  preferredStates?: string[];
  maxBudget?: number;
  preferredDurationDays?: [number, number];
  interests?: string[];
}
```

### 9.7 Service design

```typescript
// WishlistService
class WishlistService {
  // Collections
  async getCollections(userId: string): Promise<WishlistCollection[]>;
  async createCollection(userId: string, dto: CreateCollectionDto): Promise<WishlistCollection>;
  async updateCollection(collectionId: string, userId: string, dto: Partial<CreateCollectionDto>): Promise<WishlistCollection>;
  async deleteCollection(collectionId: string, userId: string): Promise<void>;

  // Items
  async getItems(collectionId: string, userId: string): Promise<WishlistItem[]>;
  async addItem(collectionId: string, userId: string, dto: AddToCollectionDto): Promise<WishlistItem>;
  async updateItem(itemId: string, userId: string, dto: Partial<AddToCollectionDto>): Promise<WishlistItem>;
  async removeItem(itemId: string, userId: string): Promise<void>;
  async quickAdd(trekId: string, userId: string): Promise<WishlistItem>;

  // Sharing
  async generateShareToken(collectionId: string, userId: string): Promise<string>;
  async getSharedCollection(token: string): Promise<WishlistCollection & { items: WishlistItem[] }>;

  // Internal
  async getTrekIdsInWishlist(userId: string): Promise<Set<string>>;
}

// RecommendationService
class RecommendationService {
  async getForUser(userId: string, limit?: number): Promise<RecommendationResult[]>;
  async getForTrek(trekId: string, limit?: number): Promise<{ trekId: string; score: number; reason: string }[]>;
  async refresh(userId: string): Promise<RecommendationResult[]>;
  async updatePreferences(userId: string, dto: RecommendationPreferenceDto): Promise<void>;
  async buildAll(): Promise<void>; // Called by cron — rebuild for all active users

  // Scoring logic
  private scoreByCompletedTreks(userId: string): Promise<Map<string, number>>;
  private scoreByWishlist(userId: string): Promise<Map<string, number>>;
  private scoreByFitness(userId: string): Promise<Map<string, number>>;
  private scoreBySeason(lat: number, lng: number): Promise<number>;
  private scoreByPopularity(): Promise<Map<string, number>>;
  private aggregate(userId: string): Promise<RecommendationResult[]>;
}
```

**Scoring weights are configurable at runtime via `PlatformSettings`:**

The 5 weights are not hardcoded in the service. They are stored as a JSON object in the existing `PlatformSettings` table under the key `recommendation_weights`:

```json
{
  "completedSimilarity": 0.30,
  "wishlistSimilarity": 0.20,
  "fitnessMatch": 0.20,
  "seasonalScore": 0.15,
  "popularityScore": 0.15,
  "coldStartCompletedSimilarity": 0.10,
  "coldStartWishlistSimilarity": 0.10,
  "coldStartFitnessMatch": 0.15,
  "coldStartSeasonalScore": 0.30,
  "coldStartPopularityScore": 0.35
}
```

The `RecommendationService` reads these weights at the start of each `buildAll()` run or can cache them with a 1-hour TTL. Admins can tune weights via `PATCH /admin/platform-settings` without a deploy.

**Scoring algorithm (aggregate):**

```
finalScore(user, trek) =
  w1 * completedSimilarity(trek) +
  w2 * wishlistSimilarity(trek) +
  w3 * fitnessMatch(trek) +
  w4 * seasonalScore(trek) +
  w5 * popularityScore(trek)
```

- `completedSimilarity`: tag-overlap Jaccard between trek and user's completed treks (reuses existing logic from the old recommendation processor, but now DB-backed)
- `wishlistSimilarity`: tag-overlap between trek and user's wishlisted treks
- `fitnessMatch`: based on trek.difficulty vs user's fitness bracket (from assessments)
- `seasonalScore`: higher if the trek is in-season now (month-based)
- `popularityScore`: normalized from trek.popularityScore

**Cold-start strategy (users with <2 completed treks AND <3 wishlist items):**

When a user has insufficient history, the cold-start weight set applies, heavily favouring seasonal and popularity signals over personal history. Additionally:
- Return the most-booked treks in their state/city as fallback
- If the user has taken a fitness assessment, bump `fitnessMatch` weight to 0.25
- Always include at least 2 "beginner-friendly" treks in the top 10 for cold-start users

### 9.8 Queue/Worker needs

**`recommendation-builder.processor.ts`** (replaces the existing one in `jobs/processors/recommendations.processor.ts`):

**Batching strategy:** Process users in batches of 100 to avoid OOM on large user bases. Each batch is committed independently so a failure in batch 50 doesn't roll back batches 1-49. Adds `BATCH_INDEX` to job progress tracking.

1. Load recommendation weights from `PlatformSettings` key `recommendation_weights` (cache in memory for job duration)
2. Query users with recent activity (last 60 days) — paginated in batches of 100
3. For each user, detect cold-start status (<2 completed treks AND <3 wishlist items)
4. Apply appropriate weight set (normal or cold-start)
5. Compute top 20 recommendations using the scoring algorithm
6. Store in `RecommendationResult` table with 24h TTL (`expiresAt`)
7. Purge `RecommendationResult` rows with `expiresAt < NOW()`
8. Runs every 6 hours via cron (existing hourly pattern adjusted in `queues.ts`)

**On-demand refresh:** When a user calls `GET /recommendations/refresh`, the service recomputes only for that user synchronously (not via queue). This handles the "I just completed a trek, show me what's next" use case immediately.

### 9.9 Integration points
- **Assessments module** — fitness bracket feeds fitnessMatch score
- **Bookings module** — completed treks feed completedSimilarity
- **Wishlist module** — wishlisted treks feed wishlistSimilarity
- **Weather module** — seasonal data influences seasonalScore
- **Treks module** — popularityScore, tags, difficulty
- **Notifications module** — "3 wishlist treks on sale!" alerts, "Your recommendations are ready"

### 9.10 Migration
One migration: `CREATE TABLE wishlist_collections`, `wishlist_items`, `user_recommendation_preferences`, `recommendation_results`, `recommendation_events`.

### 9.11 Deprecation plan for Bookmarks module

The existing `Bookmarks` module (`src/modules/bookmarks/`) is replaced by Wishlist. This is a **data migration with real data-loss risk** — not a simple checklist item. It must be split into gated sub-phases:

**Phase 5a — Deploy Wishlist alongside Bookmarks (dual-write):**
- Deploy Wishlist module with all endpoints
- Do NOT remove Bookmarks yet
- Both modules run in parallel — new saves go to Wishlist, existing Bookmarks API still works
- Monitor error rates for 1 week

**Phase 5b — Data migration (dry-run first, then live):**
1. Take a database snapshot of the `bookmarks` table (pg_dump or CREATE TABLE bookmarks_backup AS SELECT * FROM bookmarks)
2. Dry-run migration in staging: verify SQL handles edge cases (duplicate treks, orphaned user IDs, deleted treks)
3. Live migration script:
   ```sql
   -- For each user, create a default "Saved Treks" collection
   INSERT INTO wishlist_collections (id, "userId", name, "sortOrder")
   SELECT gen_random_uuid(), b."userId", 'Saved Treks', 0
   FROM (SELECT DISTINCT "userId" FROM bookmarks) b;

   -- Copy bookmarks into that collection (handle duplicates via ON CONFLICT)
   INSERT INTO wishlist_items (id, "collectionId", "trekId", "addedAt")
   SELECT gen_random_uuid(), wc.id, b."trekId", b."createdAt"
   FROM bookmarks b
   JOIN wishlist_collections wc ON wc."userId" = b."userId" AND wc.name = 'Saved Treks'
   ON CONFLICT ("collectionId", "trekId") DO NOTHING;
   ```
4. Verify: `SELECT COUNT(*) FROM bookmarks` matches `SELECT COUNT(*) FROM wishlist_items` (within tolerance for deduplication)

**Phase 5c — Cutover:**
- Remove Bookmarks routes from controller (return 410 GONE)
- Keep the `bookmarks` table and `Bookmark` entity in the codebase for 1 full release cycle
- Monitor support tickets for "my saved treks are missing"
- After 1 release cycle with no issues, drop the `bookmarks` table and remove the module

**Rollback:** Restore from `bookmarks_backup` table, re-enable Bookmarks controller routes, disable Wishlist module. The backup table must be retained for at least 30 days post-cutover.

### 9.12 Task checklist
1. Generate `wishlist` module
2. Create `WishlistCollection`, `WishlistItem` entities
3. Create DTOs for wishlist
4. Create `WishlistService`
5. Create `WishlistController`
6. Generate `recommendations` module
7. Create `UserRecommendationPreference`, `RecommendationResult`, `RecommendationEvent` entities
8. Create DTOs for recommendations (include `RecommendationPreferenceDto`)
9. Implement scoring algorithm in `RecommendationService` — read weights from `PlatformSettings`, cold-start detection, per-user fallback
10. Implement conversion tracking — log `SERVED` event on each `GET /recommendations` call, `CLICKED` on trek page view from recommendation, `BOOKED` on booking creation from recommendation
11. Create `RecommendationsController`
12. Generate single migration for both modules
13. Replace existing `recommendation-builder` processor with new DB-backed version (batched 100 users/job)
14. Register both modules in `app.module.ts`
15. Execute Bookmarks → Wishlist data migration (Phase 5a → 5b → 5c per deprecation plan)
16. Wire wishlist price-drop alerts into notifications (BullMQ processor — runs daily)
17. Seed default `recommendation_weights` into `PlatformSettings` table via migration
18. Write tests (wishlist CRUD, scoring algorithm edge cases with different weight configs, cold-start vs established-user paths, recommendation refresh, conversion event logging)

---

## Cross-cutting Concerns

### Existing module modifications

| Module | Changes needed |
|---|---|
| **Bookings** | Accept `groupId` during creation; store in metadata. Call `policyService.createSnapshot(bookingId, trekId)` atomically within booking creation transaction. Emit event on CONFIRMED status for referral reward. Call `policyService.calculateRefund()` on cancellation (uses snapshot). Extend `cancelBooking` to return `{ refundPercentage, refundAmount }` in response. |
| **Treks** | Add `@OneToMany` for `ItineraryDay`, `TrekGearItem`, `TrekSafetyInfo`. |
| **Jobs / queues.ts** | Add queues for: packing-reminder, weather-prefetch, checkin-monitor, group-expiry, group-reminder, referral-reward-delivery, recommendation-builder (replace existing). |
| **Notifications** | Ensure SMS/email fallback capability for emergency alerts. Add notification type enums for each new use case. |
| **Ormconfig** | Register all new entities. |

### Rollback strategy for each migration

Every migration in this plan must have a corresponding rollback (either via TypeORM migration `revert` or a manual SQL rollback script):

| Migration | Rollback |
|---|---|
| Itineraries: `CREATE TABLE itinerary_days` | `DROP TABLE IF EXISTS itinerary_days CASCADE` |
| Policies: `cancellation_policies`, `cancellation_tiers`, `trek_policies`, `booking_policy_snapshots` | `DROP TABLE IF EXISTS booking_policy_snapshots, trek_policies, cancellation_tiers, cancellation_policies CASCADE` |
| Gear: `gear_items`, `trek_gear_items`, `user_packing_list_items` | `DROP TABLE IF EXISTS user_packing_list_items, trek_gear_items, gear_items CASCADE` |
| Safety: `trek_safety_info`, `user_emergency_contacts`, `trek_check_ins` | `DROP TABLE IF EXISTS trek_check_ins, user_emergency_contacts, trek_safety_info CASCADE` |
| Assessments: `fitness_assessments` | `DROP TABLE IF EXISTS fitness_assessments CASCADE` |
| Groups: `trek_groups`, `group_members` | `DROP TABLE IF EXISTS group_members, trek_groups CASCADE` |
| Referrals: `referral_codes`, `referrals`, `referral_tier_config` | `DROP TABLE IF EXISTS referrals, referral_codes, referral_tier_config CASCADE` |
| Wishlist + Recommendations: `wishlist_collections`, `wishlist_items`, `user_recommendation_preferences`, `recommendation_results`, `recommendation_events` | `DROP TABLE IF EXISTS recommendation_events, recommendation_results, user_recommendation_preferences, wishlist_items, wishlist_collections CASCADE` |

**Rule:** Every migration file must have a paired `down()` method (TypeORM) or equivalent rollback SQL. The Bookmarks-to-Wishlist data migration must also have a reverse script (restore from `bookmarks_backup` table).

### Breaking changes to existing API contracts

The following existing endpoints have contract changes. Each is additive (new optional fields) — no existing required fields are removed:

| Endpoint | Change | Risk |
|---|---|---|
| `POST /bookings` | Optional `groupId` in body | Low — additive field |
| `PATCH /bookings/:id/cancel` | Now returns `refundAmount` and `refundPercentage` in response body | Medium — existing clients that don't expect these fields will still parse correctly (extra fields ignored) |
| `GET /treks/:id` | Response now includes `itineraryDays`, `gear`, `safety` as optional relations | Low — additive fields in response |
| `POST /auth/register` | Accept optional `referralCode` query param in body | Low — additive field |
| `POST /auth/register` | If referral code present, response includes `referralDiscount` | Low — additive field |
| `GET /treks/recommendations` | Response format changes from Redis-based to DB-backed | **High** — existing clients consuming raw `{ id, score }[]` format must be verified. The old response shape must be maintained during transition or mobile clients will break. |

**Migration strategy for recommendations endpoint:**
1. Ship the new `recommendations` module alongside the existing `/treks/recommendations` endpoint
2. Add a new endpoint `GET /recommendations` for the new system
3. Defer redirecting `/treks/recommendations` to the new system for 1 release cycle
4. After validation, update the old route to proxy to the new service

### Performance assumptions for batch jobs

| Job | Batching strategy | Max batch size | Fallback on failure |
|---|---|---|---|
| `recommendation-builder` | Paginate users in pages of 100 | 100 users per job iteration | Failed page retries on next job run (6h cycle). Each page is independent — one failure doesn't roll back others. |
| `weather-prefetch` | Trek list fetched in one query, individual API calls rate-limited | Determined by Weather API daily budget / 8 runs per day | If rate limit hit, skip remaining treks and cache a `RETRY_LATER` sentinel (TTL = 1 run cycle) |
| `checkin-first-warning` / `checkin-emergency` | Per-check-in delayed jobs (1:1), not batched | N/A — each job handles one check-in | BullMQ automatic retry (3 retries, exponential backoff). If all retries fail, log to `audit_logs` table for manual review. |
| `group-expiry` | Query all expired groups in one query | Unlimited (single query) | Runs hourly — missed groups picked up next cycle |
| `referral-reward-delivery` | Single referral per job trigger | N/A — event-driven, not batched | BullMQ retry (5 retries). If all fail, log to audit_logs and flag for admin review. |

### Weather rate-limiting and circuit breaker

The weather pre-fetch job must not exhaust the API provider's daily budget:

1. **Per-environment API keys:** Staging gets a separate (cheaper/free) API key with lower rate limits. Production gets the paid tier. Both configured in `.env.<environment>` files.
2. **Rate-limit tracking:** After each successful API call, check the response headers for `X-RateLimit-Remaining` (or equivalent). Store the remaining count in Redis key `weather:ratelimit:remaining` with TTL = time until reset.
3. **Graceful degradation:** If remaining calls < `NUM_TREKS_WITH_UPCOMING_DATES`, skip the pre-fetch and serve on-demand results from cache only. Log a warning.
4. **Circuit breaker:** If 3 consecutive API calls return 429 (rate limited) or 5xx, open the circuit for 1 hour. During open circuit: (a) pre-fetch job skips all API calls, (b) on-demand endpoint serves stale cache if available, (c) on-demand endpoint returns a `WEATHER_UNAVAILABLE` sentinel if no cache exists, (d) log a high-severity alert.
5. **Per-trek last-fetched timestamp:** Store `weather:trek:<id>:lastFetched` in Redis. The pre-fetch job skips treks fetched within the last 3 hours to avoid redundant calls on frequent job runs.

### .env additions

```
# Weather
WEATHER_API_KEY=
WEATHER_API_BASE_URL=
WEATHER_API_RATE_LIMIT_PER_DAY=1000
WEATHER_CIRCUIT_BREAKER_THRESHOLD=3
WEATHER_CIRCUIT_BREAKER_DURATION_MS=3600000

# SMS (for safety module emergency fallback)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### Suggested Track A → B → C build order

| Phase | Module | Dependency gates | Rollback gate |
|---|---|---|---|---|
| ✅ Phase 1 | **Itineraries** | None — standalone CRUD | ItineraryDay entity + migration deployed, 32 tests passing |
| Phase 1 | **Policies** | None — standalone CRUD, only hooks into bookings at end | Verify policy seed data present |
| Phase 2 | **Gear** | None — standalone, but seed gear library first | Verify gear_items seed count |
| Phase 2 | **Weather** | None — standalone with Redis + API key | Verify weather API key responds 200 |
| Phase 3 | **Safety** | Depends on Weather (advisory integration), but check-in logic is standalone | Verify SMS provider configured |
| Phase 3 | **Assessments** | None — standalone quiz logic | Verify assessment scoring produces correct bracket |
| Phase 4 | **Groups** | Depends on Bookings (bookForGroup) | Verify group booking creates booking with correct quantity |
| Phase 4 | **Referrals** | Depends on Users (sign-up flow), Bookings (reward trigger) | Verify referral reward delivered on booking confirm |
| Phase 5a | **Wishlist** (deploy) | None (runs alongside Bookmarks) | Verify wishlist CRUD works independently |
| Phase 5b | **Bookmarks → Wishlist migration** | Depends on Phase 5a completion | Verify `SELECT COUNT(*)` match between bookmark backup and wishlist_items |
| Phase 5c | **Bookmarks removal** | Depends on Phase 5b + 1 week monitoring | Restore from `bookmarks_backup` + re-enable Bookmarks controller |
| Phase 5d | **Recommendations** | Depends on Wishlist + Assessments + Bookings + Treks | Verify recommendation scores are non-null for active users |

---

*End of implementation plan — 9 sections covering 10 features across 3 tracks.*
