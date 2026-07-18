import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1784378403241 implements MigrationInterface {
  name = 'InitialSchema1784378403241';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ponytail: extensions must exist before gen_random_uuid() defaults / geometry
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(
      `CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM('ANDROID', 'IOS', 'WEB')`,
    );
    await queryRunner.query(
      `CREATE TABLE "device_tokens" ("id" uuid NOT NULL, "token" character varying(512) NOT NULL, "platform" "public"."device_tokens_platform_enum" NOT NULL, "app_version" character varying(20), "last_seen_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_device_tokens_user_id" ON "device_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_device_tokens_token_platform" ON "device_tokens" ("token", "platform") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER', 'FRIEND_REQUEST_RECEIVED', 'FRIEND_REQUEST_ACCEPTED', 'NEW_FOLLOWER', 'NEW_LIKE', 'NEW_COMMENT', 'TREK_UPDATE', 'ORGANIZER_APPROVED', 'ORGANIZER_REJECTED', 'STORY_EXPIRING', 'CHECK_IN_REMINDER', 'SAFETY_ALERT', 'EMERGENCY_ESCALATION', 'GROUP_INVITE', 'GROUP_UPDATE', 'WISHLIST_PRICE_DROP', 'BROADCAST')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying(255) NOT NULL, "body" text NOT NULL, "data" jsonb, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id_created_at" ON "notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user_id_read_at" ON "notifications" ("user_id", "read_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('superadmin', 'moderator', 'finance', 'support', 'analyst')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_organizer_status_enum" AS ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(120) NOT NULL, "password_hash" character varying(255), "full_name" character varying(80), "username" character varying(80), "phone" character varying, "location" character varying, "gender" "public"."users_gender_enum", "date_of_birth" date, "profile_image_url" character varying, "banner_image_url" character varying, "is_admin" boolean NOT NULL DEFAULT false, "role" "public"."users_role_enum", "organizer_status" "public"."users_organizer_status_enum" NOT NULL DEFAULT 'NONE', "email_verified" boolean NOT NULL DEFAULT false, "email_verified_at" TIMESTAMP WITH TIME ZONE, "user_points" double precision NOT NULL DEFAULT '0', "user_distance_travelled" integer NOT NULL DEFAULT '0', "organizer_rating" double precision NOT NULL DEFAULT '0', "is_organizer_active" boolean NOT NULL DEFAULT false, "is_suspended" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_images" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(512) NOT NULL, "url" character varying(1024), "is_primary" boolean NOT NULL DEFAULT false, "order" integer NOT NULL DEFAULT '0', "alt_text" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "trek_id" uuid, CONSTRAINT "PK_bdab78d1d001175c204234b4ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_tags" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "usage_count" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_6c819dc4687fbf537d879f6c2f7" UNIQUE ("name"), CONSTRAINT "PK_4f37a10910c87f659c55a86384a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_reviews" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "rating" integer NOT NULL, "comment" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "trek_id" uuid, "user_id" uuid NOT NULL, CONSTRAINT "PK_e7d57bdb14a7ca91973ba7835da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "itinerary_days" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "trek_id" uuid NOT NULL, "day_number" integer NOT NULL, "title" character varying(255) NOT NULL, "description" text, "distance_km" double precision, "altitude_gain_m" integer, "altitude_loss_m" integer, "max_altitude_m" integer, "meal_plan" jsonb, "accommodation_type" character varying(32), "activity_type" character varying(32) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c0ae2551c37a34cb2d378467830" UNIQUE ("trek_id", "day_number"), CONSTRAINT "PK_209d9b73d8e2e2ceb3aef130b37" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_itinerary_days_trek_id" ON "itinerary_days" ("trek_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "gear_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(255) NOT NULL, "category" character varying(32) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_83c4c937bf10dbd7770793ddab8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_gear_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "trek_id" uuid NOT NULL, "gear_item_id" uuid NOT NULL, "requirement_type" character varying(16) NOT NULL, "rental_price_inr" integer, "notes" character varying(512), "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_8de5e1568073892d352c8e6993d" UNIQUE ("trek_id", "gear_item_id"), CONSTRAINT "PK_8eaa486764f2b3573cb0abd2a03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trek_gear_items_trek_id" ON "trek_gear_items" ("trek_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."treks_difficulty_enum" AS ENUM('EASY', 'MODERATE', 'DIFFICULT', 'EXTREME')`,
    );
    await queryRunner.query(
      `CREATE TABLE "treks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(255) NOT NULL, "slug" character varying(255), "short_description" character varying(512), "full_description" text, "state" character varying(80), "location" character varying(255), "latitude" double precision, "longitude" double precision, "geom" geometry(Point,4326), "start_date" TIMESTAMP WITH TIME ZONE, "end_date" TIMESTAMP WITH TIME ZONE, "difficulty" "public"."treks_difficulty_enum", "cost_inr" integer NOT NULL DEFAULT '0', "max_participants" integer NOT NULL DEFAULT '1', "is_published" boolean NOT NULL DEFAULT false, "current_participants" integer NOT NULL DEFAULT '0', "status" character varying(32) NOT NULL DEFAULT 'DRAFT', "avg_rating" double precision NOT NULL DEFAULT '0', "rating_count" integer NOT NULL DEFAULT '0', "popularity_score" bigint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "organizer_id" uuid, CONSTRAINT "UQ_01f0ae6ded96920e2c5b1f7bd1b" UNIQUE ("slug"), CONSTRAINT "PK_14b251e765bdf8fe4c0b5f3bad6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_treks_difficulty" ON "treks" ("difficulty") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_treks_state" ON "treks" ("state") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."trek_interactions_type_enum" AS ENUM('VIEW', 'BOOKMARK', 'BOOKING', 'LIKE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_interactions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "public"."trek_interactions_type_enum" NOT NULL, "weight" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "trek_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_2e546c1bd987925e6ac6a9a2808" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."friend_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "friend_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "status" "public"."friend_requests_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sender_id" uuid NOT NULL, "receiver_id" uuid NOT NULL, CONSTRAINT "PK_3827ba86ce64ecb4b90c92eeea6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_friend_requests_receiver_id_status" ON "friend_requests" ("receiver_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "trek_id" uuid NOT NULL, "trek_snapshot" jsonb NOT NULL, "user_id" uuid NOT NULL, "participants" jsonb, "quantity" integer NOT NULL, "unit_price_inr" integer NOT NULL, "total_amount_inr" integer NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'PENDING', "payment_id" uuid, "hold_expires_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_trek_id_status" ON "bookings" ("trek_id", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "provider" character varying(32) NOT NULL, "provider_payment_id" character varying, "status" character varying(32) NOT NULL DEFAULT 'CREATED', "amount_inr" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'INR', "provider_response" jsonb, "idempotency_key" character varying, "metadata" jsonb, "refund_audit" jsonb, "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizer_applications_status_enum" AS ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizer_applications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "organization_name" character varying(160) NOT NULL, "contact_person" character varying(160), "contact_phone" character varying(20) NOT NULL, "website" character varying(160), "bio" text NOT NULL, "years_of_experience" integer, "document_urls" jsonb, "certificate_urls" jsonb, "status" "public"."organizer_applications_status_enum" NOT NULL DEFAULT 'PENDING', "admin_notes" text, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1146b351673b28f9361fb4fd71d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_organizer_applications_pending_user" ON "organizer_applications" ("user_id") WHERE "status" = 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_id" uuid, "actor_email" character varying(120), "actor_role" character varying(64), "action" character varying(128) NOT NULL, "resource_type" character varying(64), "resource_id" uuid, "detail" jsonb, "ip" character varying(45), "user_agent" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_resource_type_resource_id" ON "audit_logs" ("resource_type", "resource_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_action" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_actor_id" ON "audit_logs" ("actor_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "platform_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(128) NOT NULL DEFAULT 'platform_settings', "settings" jsonb NOT NULL, "changed_by" uuid, "changed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2934aeb70ec285196dcab4a2e96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "webhook_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "provider" character varying(20) NOT NULL, "event_type" character varying(100) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'processed', "status_code" integer, "request_body" text, "response_body" text, "error" text, "duration_ms" integer, "retry_count" integer NOT NULL DEFAULT '0', "last_retry_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c41f6cdf59cdfe3704807650896" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_status" ON "webhook_logs" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_provider_created_at" ON "webhook_logs" ("provider", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "itinerary_templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(200) NOT NULL, "description" text, "region" character varying(100), "usage_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d48d23293e94f9c888683c390e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "itinerary_template_days" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "template_id" uuid NOT NULL, "day_number" integer NOT NULL, "title" character varying(200), "description" text, "activities" text, "accommodation" character varying(100), "meals" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e3f0e9f2654365158d726dc3b30" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_itinerary_template_days_template_id" ON "itinerary_template_days" ("template_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "data_deletion_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'pending', "reviewed_by" uuid, "rejection_reason" text, "processed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_05527932a91632aa6401c5c62f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_data_deletion_requests_status" ON "data_deletion_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_data_deletion_requests_user_id" ON "data_deletion_requests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "data_export_requests" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'pending', "reviewed_by" uuid, "rejection_reason" text, "file_url" text, "file_size" bigint, "processed_at" TIMESTAMP WITH TIME ZONE, "download_expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6b9acf6ac7b80c6af72a1ffe3c6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_data_export_requests_status" ON "data_export_requests" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_data_export_requests_user_id" ON "data_export_requests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_notification_preferences" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "admin_id" uuid NOT NULL, "event_type" character varying(64) NOT NULL, "channel" character varying(16) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e70102e4c2956f4f1ce2bf2540c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_admin_notification_preferences_admin_id_event_type" ON "admin_notification_preferences" ("admin_id", "event_type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_tasks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying(64) NOT NULL, "resource_type" character varying(64), "resource_id" uuid, "assigned_to" uuid, "status" character varying(16) NOT NULL DEFAULT 'OPEN', "priority" character varying(16) NOT NULL DEFAULT 'MEDIUM', "due_by" TIMESTAMP WITH TIME ZONE, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bccf758b9bd2ed511dd04cbd055" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_tasks_type" ON "admin_tasks" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_tasks_status" ON "admin_tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_admin_tasks_assigned_to" ON "admin_tasks" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organizer_documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organizer_id" uuid NOT NULL, "document_type" character varying(32) NOT NULL, "file_url" text NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "verified_by" uuid, "verified_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "rejection_reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a60aa06c5f24afac425b4809435" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organizer_documents_expires_at" ON "organizer_documents" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organizer_documents_status" ON "organizer_documents" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organizer_documents_organizer_id" ON "organizer_documents" ("organizer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "duplicate_candidates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "entity_type" character varying(16) NOT NULL, "primary_id" uuid NOT NULL, "candidate_id" uuid NOT NULL, "similarity_score" double precision NOT NULL DEFAULT '0', "status" character varying(16) NOT NULL DEFAULT 'open', "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ab92e7eb022be6482abf6d575f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_duplicate_candidates_status" ON "duplicate_candidates" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_duplicate_candidates_entity_type" ON "duplicate_candidates" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cohort_exports" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "filters" jsonb NOT NULL, "format" character varying(8) NOT NULL DEFAULT 'csv', "row_count" integer, "file_url" text, "status" character varying(32) NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c2181ef26c644b5e61660f8d506" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_campaigns" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(200) NOT NULL, "trek_ids" uuid array NOT NULL, "discount_type" character varying(16) NOT NULL, "discount_value" integer NOT NULL, "max_cap" integer, "min_booking_amount" integer, "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9dc33b703eaf8aef9a1eb3d63e8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pricing_campaigns_is_active" ON "pricing_campaigns" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pricing_campaigns_start_date_end_date" ON "pricing_campaigns" ("start_date", "end_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organizer_id" uuid NOT NULL, "amount" integer NOT NULL, "platform_fee" integer NOT NULL DEFAULT '0', "net_amount" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'PENDING', "period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "settled_at" TIMESTAMP WITH TIME ZONE, "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payouts_period_start_period_end" ON "payouts" ("period_start", "period_end") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payouts_status" ON "payouts" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payouts_organizer_id" ON "payouts" ("organizer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "promotional_banners" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(200) NOT NULL, "subtitle" character varying(400), "image_url" text NOT NULL, "cta_text" character varying(100), "cta_link" text, "placement" character varying(32) NOT NULL DEFAULT 'homepage', "start_date" TIMESTAMP WITH TIME ZONE NOT NULL, "end_date" TIMESTAMP WITH TIME ZONE NOT NULL, "priority" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "impressions" integer NOT NULL DEFAULT '0', "clicks" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5e13f8da4099d82aa141decdb12" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_promotional_banners_start_date_end_date" ON "promotional_banners" ("start_date", "end_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_promotional_banners_placement_is_active" ON "promotional_banners" ("placement", "is_active") `,
    );
    await queryRunner.query(
      `CREATE TABLE "badges" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "description" text, "icon_url" text, "category" character varying(64), "criteria" jsonb, "is_auto_awardable" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a6118739404276dfeb86e349acf" UNIQUE ("slug"), CONSTRAINT "PK_8a651318b8de577e8e217676466" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_badges_slug" ON "badges" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "badge_awards" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "badge_id" uuid NOT NULL, "user_id" uuid NOT NULL, "source" character varying(64) NOT NULL DEFAULT 'auto', "awarded_by" uuid, "reason" text, "awarded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5fa679a182a2bd25a7be1ab1e6a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_badge_awards_badge_id_user_id" ON "badge_awards" ("badge_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_badge_awards_user_id" ON "badge_awards" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_badge_awards_badge_id" ON "badge_awards" ("badge_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."weather_alerts_severity_enum" AS ENUM('ADVISORY', 'WATCH', 'WARNING')`,
    );
    await queryRunner.query(
      `CREATE TABLE "weather_alerts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(200) NOT NULL, "body" text NOT NULL, "severity" "public"."weather_alerts_severity_enum" NOT NULL DEFAULT 'ADVISORY', "affected_region" jsonb, "is_active" boolean NOT NULL DEFAULT true, "expires_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_aaeef6da946444b235a77352907" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_weather_alerts_created_at" ON "weather_alerts" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_weather_alerts_severity" ON "weather_alerts" ("severity") `,
    );
    await queryRunner.query(
      `CREATE TABLE "failed_login_attempts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid, "email" character varying(255), "ip" character varying(45) NOT NULL, "user_agent" character varying(255), "reason" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_72c47266a3aaba52e6e8235f054" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_failed_login_attempts_created_at" ON "failed_login_attempts" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_failed_login_attempts_user_id" ON "failed_login_attempts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_failed_login_attempts_ip" ON "failed_login_attempts" ("ip") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ip_access_rules_list_type_enum" AS ENUM('blocklist', 'allowlist')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ip_access_rules" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "list_type" "public"."ip_access_rules_list_type_enum" NOT NULL, "ip_cidr" character varying(45) NOT NULL, "reason" text, "expires_at" TIMESTAMP WITH TIME ZONE, "hit_count" integer NOT NULL DEFAULT '0', "last_hit_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_806782c054afc4738067a94d94b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ip_access_rules_list_type_expires_at" ON "ip_access_rules" ("list_type", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key_hash" character varying(64) NOT NULL, "name" character varying(120) NOT NULL, "permissions" character varying array NOT NULL DEFAULT '{}', "expires_at" TIMESTAMP WITH TIME ZONE, "last_used_at" TIMESTAMP WITH TIME ZONE, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_api_keys_key_hash" ON "api_keys" ("key_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "feature_flags" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(80) NOT NULL, "description" text, "enabled" boolean NOT NULL DEFAULT false, "percentage" integer NOT NULL DEFAULT '100', "user_segment" character varying(80), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_db657d344e9caacfc9d5cf8bbac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_feature_flags_key" ON "feature_flags" ("key") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."coupons_discount_type_enum" AS ENUM('PERCENTAGE', 'FLAT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "code" character varying(60) NOT NULL, "discount_type" "public"."coupons_discount_type_enum" NOT NULL DEFAULT 'PERCENTAGE', "discount_value" integer NOT NULL, "max_discount_cap" integer, "min_booking_amount" integer NOT NULL DEFAULT '0', "max_uses" integer, "used_count" integer NOT NULL DEFAULT '0', "applicable_trek_ids" uuid array NOT NULL DEFAULT '{}', "valid_from" TIMESTAMP WITH TIME ZONE, "valid_to" TIMESTAMP WITH TIME ZONE, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_coupons_code" ON "coupons" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coupon_redemptions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "coupon_id" uuid NOT NULL, "user_id" uuid NOT NULL, "booking_id" uuid NOT NULL, "discount_amount" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5086813ea980d21dbeb190ed0a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coupon_redemptions_booking_id" ON "coupon_redemptions" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions" ("coupon_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "platform_settings_presets" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(80) NOT NULL, "description" text, "settings" jsonb NOT NULL, "is_built_in" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_aeb7278d6aeb89be1ec94556842" UNIQUE ("name"), CONSTRAINT "PK_e1a8e020df8d5437781e248af25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(120) NOT NULL, "slug" character varying(120) NOT NULL, "parent_id" uuid, "sort_order" integer NOT NULL DEFAULT '0', "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_44b2cf8ed94ab859f09bc755017" UNIQUE ("name"), CONSTRAINT "UQ_086d7fd0097a87f82ab133f8265" UNIQUE ("slug"), CONSTRAINT "PK_b40a70300c9a27866b219d87f91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."media_category_enum" AS ENUM('PROFILE', 'BANNER', 'POST', 'TREK', 'STORY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "media" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "bucket" character varying(50) NOT NULL, "key" character varying(255) NOT NULL, "original_name" character varying(255) NOT NULL, "mime_type" character varying(50) NOT NULL, "size_bytes" integer NOT NULL, "category" "public"."media_category_enum" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "leaderboard_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "score" double precision NOT NULL DEFAULT '0', "rank" integer NOT NULL DEFAULT '0', "board_type" character varying(20) NOT NULL DEFAULT 'global', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3187f7d37819756a5519336665" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leaderboard_entries_score_updated_at" ON "leaderboard_entries" ("score", "updated_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leaderboard_entries_user_id" ON "leaderboard_entries" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "target_type" character varying(20) NOT NULL, "target_id" uuid NOT NULL, "reason" character varying(20) NOT NULL, "description" text, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'PENDING', "admin_notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reviewed_at" TIMESTAMP WITH TIME ZONE, "reporter_id" uuid, "reviewed_by_id" uuid, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reports_target_type_target_id" ON "reports" ("target_type", "target_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reports_status" ON "reports" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_campaigns_status_enum" AS ENUM('PENDING', 'SENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_campaigns" ("id" uuid NOT NULL, "title" character varying(255) NOT NULL, "body" text NOT NULL, "image_url" character varying(512), "deep_link" character varying(512), "segment_config" jsonb NOT NULL, "status" "public"."notification_campaigns_status_enum" NOT NULL DEFAULT 'PENDING', "total_users" integer, "total_batches" integer, "completed_batches" integer, "error" text, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6bd3e0649c6f3fb8caa63dd39ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cancellation_tiers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "policy_id" uuid NOT NULL, "from_hours_before_start" integer NOT NULL, "to_hours_before_start" integer, "refund_percentage" integer NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_d5790c16e27143613e0297c2015" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cancellation_tiers_policy_id_sort_order" ON "cancellation_tiers" ("policy_id", "sort_order") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cancellation_policies" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(80) NOT NULL, "description" character varying(512), "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_325e14a8f8003ef85146eecfc57" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_policies" ("trek_id" uuid NOT NULL, "policy_id" uuid NOT NULL, CONSTRAINT "PK_ed8f66dcdb9a03a04536285ae6f" PRIMARY KEY ("trek_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_policy_snapshots" ("booking_id" uuid NOT NULL, "policy_name" character varying(80) NOT NULL, "tiers" jsonb NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bc8868e5dfc80900c01d48de5bd" PRIMARY KEY ("booking_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_packing_list_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "trek_gear_item_id" uuid NOT NULL, "has_item" boolean NOT NULL DEFAULT false, "needs_rental" boolean NOT NULL DEFAULT false, "checked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_70fc693f739c13586f58892cd5c" UNIQUE ("user_id", "trek_gear_item_id"), CONSTRAINT "PK_12591586957cb807f7b4e835dc7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_packing_list_items_user_id" ON "user_packing_list_items" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_safety_info" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "trek_id" uuid NOT NULL, "terrain_risks" text, "altitude_warnings" text, "wildlife_advisories" text, "general_guidelines" text, "base_camp_contact" character varying(32), "local_rescue_contact" character varying(32), "nearest_hospital" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_142f92a18de7a4cdd134fc73aa" UNIQUE ("trek_id"), CONSTRAINT "PK_84c8d2425c134fa8fd5ea45b610" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_emergency_contacts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "phone" character varying(20) NOT NULL, "relationship" character varying(40) NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2461185b06a066a22feba26d342" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_emergency_contacts_user_id" ON "user_emergency_contacts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_check_ins" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "user_id" uuid NOT NULL, "checked_in_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expected_check_out_at" TIMESTAMP WITH TIME ZONE NOT NULL, "checked_out_at" TIMESTAMP WITH TIME ZONE, "status" character varying(16) NOT NULL DEFAULT 'ACTIVE', "escalated_at" TIMESTAMP WITH TIME ZONE, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_7b331630c4b0c512bcdd85b72e" UNIQUE ("booking_id"), CONSTRAINT "PK_55c9f5f815fc33d57424bec04dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_trek_check_ins_booking_id" ON "trek_check_ins" ("booking_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trek_check_ins_user_id" ON "trek_check_ins" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trek_check_ins_status_expected_check_out_at" ON "trek_check_ins" ("status", "expected_check_out_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fitness_assessments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "total_score" integer NOT NULL, "difficulty_bracket" character varying(16) NOT NULL, "answers" jsonb NOT NULL, "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7c7a04fe41a5d50f04f68d7da70" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fitness_assessments_user_id_completed_at" ON "fitness_assessments" ("user_id", "completed_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "group_members" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "group_id" uuid NOT NULL, "user_id" uuid, "email" character varying(120) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'INVITED', "full_name" character varying(80), "phone" character varying(20), "emergency_contact" jsonb, "medical_conditions" text, "joined_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_86446139b2c96bfd0f3b8638852" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_group_members_group_id_user_id" ON "group_members" ("group_id", "user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "trek_id" uuid NOT NULL, "lead_user_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "max_size" integer NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'OPEN', "share_code" character varying(12) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b0b33e2b52e8aa8db0b416b7dca" UNIQUE ("share_code"), CONSTRAINT "PK_5c6d6db5237a4cf50acc237b279" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_trek_groups_trek_id_status" ON "trek_groups" ("trek_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_trek_groups_share_code" ON "trek_groups" ("share_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "referral_codes" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "code" character varying(20) NOT NULL, "tier" character varying(16) NOT NULL DEFAULT 'BASE', "total_referrals" integer NOT NULL DEFAULT '0', "successful_referrals" integer NOT NULL DEFAULT '0', "total_earned_inr" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_adda7b9deda346ff710695f4968" UNIQUE ("code"), CONSTRAINT "PK_99f08e2ed9d39d8ce902f5f1f41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_referral_codes_user_id" ON "referral_codes" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_referral_codes_code" ON "referral_codes" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "referrals" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "referrer_code_id" uuid NOT NULL, "referee_user_id" uuid, "referee_email" character varying(120) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'PENDING', "reward_type" character varying(16), "reward_value_inr" integer, "reward_delivered_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_referrals_referee_user_id" ON "referrals" ("referee_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_referrals_referrer_code_id_referee_email" ON "referrals" ("referrer_code_id", "referee_email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "referral_tier_config" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tier" character varying(16) NOT NULL, "min_successful_referrals" integer NOT NULL, "reward_per_referral_inr" integer NOT NULL, "referee_discount_inr" integer NOT NULL, CONSTRAINT "UQ_078a4e8f32609ab6f3b6ea35789" UNIQUE ("tier"), CONSTRAINT "PK_5a97572bb36cc296a772a388de5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wishlist_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "collection_id" uuid NOT NULL, "trek_id" uuid NOT NULL, "notes" character varying(512), "priority" integer NOT NULL DEFAULT '0', "sort_order" integer NOT NULL DEFAULT '0', "base_price_inr" integer, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0bd52924a97cda208ed2a07bd69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_wishlist_items_collection_id_trek_id" ON "wishlist_items" ("collection_id", "trek_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "wishlist_collections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "description" character varying(512), "sort_order" integer NOT NULL DEFAULT '0', "share_token" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_58406d8eeba053d7a661d477afb" UNIQUE ("share_token"), CONSTRAINT "PK_179e9d70772d4e515543fed068b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_wishlist_collections_user_id_name" ON "wishlist_collections" ("user_id", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_recommendation_preferences" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "preferred_difficulty" character varying array, "preferred_states" character varying(80) array, "max_budget" integer, "preferred_duration_days" integer array, "interests" jsonb, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5cbfd3b6f3ae9c1c70600a64915" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_recommendation_preferences_user_id" ON "user_recommendation_preferences" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "recommendation_results" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "trek_id" uuid NOT NULL, "score" double precision NOT NULL, "reason" character varying(32) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_be6d308edad571a4e832f7f300d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_results_user_id_score" ON "recommendation_results" ("user_id", "score") `,
    );
    await queryRunner.query(
      `CREATE TABLE "recommendation_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "recommendation_result_id" uuid, "trek_id" uuid NOT NULL, "event_type" character varying(32) NOT NULL, "score" double precision, "reason" character varying(32), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f383c8576d8b5738d6c12ddb137" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_events_trek_id_event_type" ON "recommendation_events" ("trek_id", "event_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_events_user_id_event_type_created_at" ON "recommendation_events" ("user_id", "event_type", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "analytics_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "event" character varying(64) NOT NULL, "properties" jsonb, "ip_address" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_analytics_events_event_created_at" ON "analytics_events" ("event", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_analytics_events_user_id_created_at" ON "analytics_events" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "trek_collections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(200) NOT NULL, "slug" character varying(200) NOT NULL, "description" text, "trek_ids" uuid array NOT NULL DEFAULT '{}', "is_active" boolean NOT NULL DEFAULT true, "cover_image" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2dcc711e538fdd46cd5e3b922d7" UNIQUE ("slug"), CONSTRAINT "PK_870dca6122823e970d80237e484" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(100) NOT NULL, "subject" character varying(255) NOT NULL, "body_html" text NOT NULL, "variables" jsonb, "is_active" boolean NOT NULL DEFAULT true, "version" integer NOT NULL DEFAULT '1', "version_history" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e832fef7d0d7dd4da2792eddbf7" UNIQUE ("name"), CONSTRAINT "PK_06c564c515d8cdb40b6f3bfbbb4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_email_templates_is_active" ON "email_templates" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_email_templates_name" ON "email_templates" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "treks_trek_tags" ("treks_id" uuid NOT NULL, "trek_tags_id" uuid NOT NULL, CONSTRAINT "PK_5d4e6af108fc5dd85370ced9242" PRIMARY KEY ("treks_id", "trek_tags_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_treks_trek_tags_treks_id" ON "treks_trek_tags" ("treks_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_treks_trek_tags_trek_tags_id" ON "treks_trek_tags" ("trek_tags_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "fk_device_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_images" ADD CONSTRAINT "fk_trek_images_trek_id" FOREIGN KEY ("trek_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_reviews" ADD CONSTRAINT "fk_trek_reviews_trek_id" FOREIGN KEY ("trek_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_reviews" ADD CONSTRAINT "fk_trek_reviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "itinerary_days" ADD CONSTRAINT "fk_itinerary_days_trek_id" FOREIGN KEY ("trek_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_gear_items" ADD CONSTRAINT "fk_trek_gear_items_trek_id" FOREIGN KEY ("trek_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_gear_items" ADD CONSTRAINT "fk_trek_gear_items_gear_item_id" FOREIGN KEY ("gear_item_id") REFERENCES "gear_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "treks" ADD CONSTRAINT "fk_treks_organizer_id" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_interactions" ADD CONSTRAINT "fk_trek_interactions_trek_id" FOREIGN KEY ("trek_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_interactions" ADD CONSTRAINT "fk_trek_interactions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_requests" ADD CONSTRAINT "fk_friend_requests_sender_id" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_requests" ADD CONSTRAINT "fk_friend_requests_receiver_id" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizer_applications" ADD CONSTRAINT "fk_organizer_applications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD CONSTRAINT "fk_media_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "fk_leaderboard_entries_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "fk_reports_reporter_id" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "fk_reports_reviewed_by_id" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_campaigns" ADD CONSTRAINT "fk_notification_campaigns_created_by_id" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_tiers" ADD CONSTRAINT "fk_cancellation_tiers_policy_id" FOREIGN KEY ("policy_id") REFERENCES "cancellation_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_policies" ADD CONSTRAINT "fk_trek_policies_policy_id" FOREIGN KEY ("policy_id") REFERENCES "cancellation_policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_packing_list_items" ADD CONSTRAINT "fk_user_packing_list_items_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_packing_list_items" ADD CONSTRAINT "fk_user_packing_list_items_trek_gear_item_id" FOREIGN KEY ("trek_gear_item_id") REFERENCES "trek_gear_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_safety_info" ADD CONSTRAINT "fk_trek_safety_info_trek_id" FOREIGN KEY ("trek_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_emergency_contacts" ADD CONSTRAINT "fk_user_emergency_contacts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_check_ins" ADD CONSTRAINT "fk_trek_check_ins_booking_id" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_check_ins" ADD CONSTRAINT "fk_trek_check_ins_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" ADD CONSTRAINT "fk_group_members_group_id" FOREIGN KEY ("group_id") REFERENCES "trek_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "fk_wishlist_items_collection_id" FOREIGN KEY ("collection_id") REFERENCES "wishlist_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "treks_trek_tags" ADD CONSTRAINT "fk_treks_trek_tags_treks_id" FOREIGN KEY ("treks_id") REFERENCES "treks"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "treks_trek_tags" ADD CONSTRAINT "fk_treks_trek_tags_trek_tags_id" FOREIGN KEY ("trek_tags_id") REFERENCES "trek_tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "treks_trek_tags" DROP CONSTRAINT "fk_treks_trek_tags_trek_tags_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "treks_trek_tags" DROP CONSTRAINT "fk_treks_trek_tags_treks_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "fk_wishlist_items_collection_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_members" DROP CONSTRAINT "fk_group_members_group_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_check_ins" DROP CONSTRAINT "fk_trek_check_ins_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_check_ins" DROP CONSTRAINT "fk_trek_check_ins_booking_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_emergency_contacts" DROP CONSTRAINT "fk_user_emergency_contacts_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_safety_info" DROP CONSTRAINT "fk_trek_safety_info_trek_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_packing_list_items" DROP CONSTRAINT "fk_user_packing_list_items_trek_gear_item_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_packing_list_items" DROP CONSTRAINT "fk_user_packing_list_items_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_policies" DROP CONSTRAINT "fk_trek_policies_policy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cancellation_tiers" DROP CONSTRAINT "fk_cancellation_tiers_policy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_campaigns" DROP CONSTRAINT "fk_notification_campaigns_created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "fk_reports_reviewed_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" DROP CONSTRAINT "fk_reports_reporter_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leaderboard_entries" DROP CONSTRAINT "fk_leaderboard_entries_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" DROP CONSTRAINT "fk_media_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizer_applications" DROP CONSTRAINT "fk_organizer_applications_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_requests" DROP CONSTRAINT "fk_friend_requests_receiver_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_requests" DROP CONSTRAINT "fk_friend_requests_sender_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_interactions" DROP CONSTRAINT "fk_trek_interactions_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_interactions" DROP CONSTRAINT "fk_trek_interactions_trek_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "treks" DROP CONSTRAINT "fk_treks_organizer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_gear_items" DROP CONSTRAINT "fk_trek_gear_items_gear_item_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_gear_items" DROP CONSTRAINT "fk_trek_gear_items_trek_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itinerary_days" DROP CONSTRAINT "fk_itinerary_days_trek_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_reviews" DROP CONSTRAINT "fk_trek_reviews_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_reviews" DROP CONSTRAINT "fk_trek_reviews_trek_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trek_images" DROP CONSTRAINT "fk_trek_images_trek_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "fk_notifications_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP CONSTRAINT "fk_device_tokens_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_treks_trek_tags_trek_tags_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_treks_trek_tags_treks_id"`,
    );
    await queryRunner.query(`DROP TABLE "treks_trek_tags"`);
    await queryRunner.query(`DROP INDEX "public"."idx_email_templates_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_email_templates_is_active"`,
    );
    await queryRunner.query(`DROP TABLE "email_templates"`);
    await queryRunner.query(`DROP TABLE "trek_collections"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_analytics_events_user_id_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_analytics_events_event_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "analytics_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_recommendation_events_user_id_event_type_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_recommendation_events_trek_id_event_type"`,
    );
    await queryRunner.query(`DROP TABLE "recommendation_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_recommendation_results_user_id_score"`,
    );
    await queryRunner.query(`DROP TABLE "recommendation_results"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_recommendation_preferences_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_recommendation_preferences"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_wishlist_collections_user_id_name"`,
    );
    await queryRunner.query(`DROP TABLE "wishlist_collections"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_wishlist_items_collection_id_trek_id"`,
    );
    await queryRunner.query(`DROP TABLE "wishlist_items"`);
    await queryRunner.query(`DROP TABLE "referral_tier_config"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_referrals_referrer_code_id_referee_email"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_referrals_referee_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "referrals"`);
    await queryRunner.query(`DROP INDEX "public"."idx_referral_codes_code"`);
    await queryRunner.query(`DROP INDEX "public"."idx_referral_codes_user_id"`);
    await queryRunner.query(`DROP TABLE "referral_codes"`);
    await queryRunner.query(`DROP INDEX "public"."idx_trek_groups_share_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_trek_groups_trek_id_status"`,
    );
    await queryRunner.query(`DROP TABLE "trek_groups"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_group_members_group_id_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "group_members"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_fitness_assessments_user_id_completed_at"`,
    );
    await queryRunner.query(`DROP TABLE "fitness_assessments"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_trek_check_ins_status_expected_check_out_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_trek_check_ins_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_trek_check_ins_booking_id"`,
    );
    await queryRunner.query(`DROP TABLE "trek_check_ins"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_emergency_contacts_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_emergency_contacts"`);
    await queryRunner.query(`DROP TABLE "trek_safety_info"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_packing_list_items_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_packing_list_items"`);
    await queryRunner.query(`DROP TABLE "booking_policy_snapshots"`);
    await queryRunner.query(`DROP TABLE "trek_policies"`);
    await queryRunner.query(`DROP TABLE "cancellation_policies"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_cancellation_tiers_policy_id_sort_order"`,
    );
    await queryRunner.query(`DROP TABLE "cancellation_tiers"`);
    await queryRunner.query(`DROP TABLE "notification_campaigns"`);
    await queryRunner.query(
      `DROP TYPE "public"."notification_campaigns_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_reports_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_reports_target_type_target_id"`,
    );
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_leaderboard_entries_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_leaderboard_entries_score_updated_at"`,
    );
    await queryRunner.query(`DROP TABLE "leaderboard_entries"`);
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`DROP TYPE "public"."media_category_enum"`);
    await queryRunner.query(`DROP TABLE "trek_categories"`);
    await queryRunner.query(`DROP TABLE "platform_settings_presets"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_coupon_redemptions_coupon_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_coupon_redemptions_booking_id"`,
    );
    await queryRunner.query(`DROP TABLE "coupon_redemptions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_coupons_code"`);
    await queryRunner.query(`DROP TABLE "coupons"`);
    await queryRunner.query(`DROP TYPE "public"."coupons_discount_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_feature_flags_key"`);
    await queryRunner.query(`DROP TABLE "feature_flags"`);
    await queryRunner.query(`DROP INDEX "public"."idx_api_keys_key_hash"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_ip_access_rules_list_type_expires_at"`,
    );
    await queryRunner.query(`DROP TABLE "ip_access_rules"`);
    await queryRunner.query(
      `DROP TYPE "public"."ip_access_rules_list_type_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_failed_login_attempts_ip"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_failed_login_attempts_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_failed_login_attempts_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "failed_login_attempts"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_weather_alerts_severity"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_weather_alerts_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "weather_alerts"`);
    await queryRunner.query(
      `DROP TYPE "public"."weather_alerts_severity_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_badge_awards_badge_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_badge_awards_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_badge_awards_badge_id_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "badge_awards"`);
    await queryRunner.query(`DROP INDEX "public"."idx_badges_slug"`);
    await queryRunner.query(`DROP TABLE "badges"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_promotional_banners_placement_is_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_promotional_banners_start_date_end_date"`,
    );
    await queryRunner.query(`DROP TABLE "promotional_banners"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_organizer_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payouts_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_payouts_period_start_period_end"`,
    );
    await queryRunner.query(`DROP TABLE "payouts"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_pricing_campaigns_start_date_end_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_pricing_campaigns_is_active"`,
    );
    await queryRunner.query(`DROP TABLE "pricing_campaigns"`);
    await queryRunner.query(`DROP TABLE "cohort_exports"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_duplicate_candidates_entity_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_duplicate_candidates_status"`,
    );
    await queryRunner.query(`DROP TABLE "duplicate_candidates"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_organizer_documents_organizer_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_organizer_documents_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_organizer_documents_expires_at"`,
    );
    await queryRunner.query(`DROP TABLE "organizer_documents"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_admin_tasks_assigned_to"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_admin_tasks_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_admin_tasks_type"`);
    await queryRunner.query(`DROP TABLE "admin_tasks"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_admin_notification_preferences_admin_id_event_type"`,
    );
    await queryRunner.query(`DROP TABLE "admin_notification_preferences"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_data_export_requests_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_data_export_requests_status"`,
    );
    await queryRunner.query(`DROP TABLE "data_export_requests"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_data_deletion_requests_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_data_deletion_requests_status"`,
    );
    await queryRunner.query(`DROP TABLE "data_deletion_requests"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_itinerary_template_days_template_id"`,
    );
    await queryRunner.query(`DROP TABLE "itinerary_template_days"`);
    await queryRunner.query(`DROP TABLE "itinerary_templates"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_webhook_logs_provider_created_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_webhook_logs_status"`);
    await queryRunner.query(`DROP TABLE "webhook_logs"`);
    await queryRunner.query(`DROP TABLE "platform_settings"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_actor_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_action"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_audit_logs_resource_type_resource_id"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_organizer_applications_pending_user"`,
    );
    await queryRunner.query(`DROP TABLE "organizer_applications"`);
    await queryRunner.query(
      `DROP TYPE "public"."organizer_applications_status_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_payments_status"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_bookings_trek_id_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_status"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_friend_requests_receiver_id_status"`,
    );
    await queryRunner.query(`DROP TABLE "friend_requests"`);
    await queryRunner.query(`DROP TYPE "public"."friend_requests_status_enum"`);
    await queryRunner.query(`DROP TABLE "trek_interactions"`);
    await queryRunner.query(`DROP TYPE "public"."trek_interactions_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_treks_state"`);
    await queryRunner.query(`DROP INDEX "public"."idx_treks_difficulty"`);
    await queryRunner.query(`DROP TABLE "treks"`);
    await queryRunner.query(`DROP TYPE "public"."treks_difficulty_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_trek_gear_items_trek_id"`,
    );
    await queryRunner.query(`DROP TABLE "trek_gear_items"`);
    await queryRunner.query(`DROP TABLE "gear_items"`);
    await queryRunner.query(`DROP INDEX "public"."idx_itinerary_days_trek_id"`);
    await queryRunner.query(`DROP TABLE "itinerary_days"`);
    await queryRunner.query(`DROP TABLE "trek_reviews"`);
    await queryRunner.query(`DROP TABLE "trek_tags"`);
    await queryRunner.query(`DROP TABLE "trek_images"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_organizer_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_gender_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_user_id_read_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_user_id_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_device_tokens_token_platform"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_device_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."device_tokens_platform_enum"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pgcrypto`);
  }
}
