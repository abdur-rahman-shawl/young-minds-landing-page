CREATE TYPE "public"."certificate_status" AS ENUM('NOT_EARNED', 'EARNED', 'ISSUED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'COMPLETED', 'DROPPED', 'PAUSED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."progress_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "course_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"content_item_id" uuid,
	"event_type" text NOT NULL,
	"event_data" text,
	"session_id" text NOT NULL,
	"device_type" text,
	"browser_info" text,
	"ip_address" text,
	"duration_seconds" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon_url" text,
	"color" text,
	"parent_category_id" uuid,
	"order_index" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_category_relations" (
	"course_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_category_relations_course_id_category_id_pk" PRIMARY KEY("course_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "course_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"certificate_number" text NOT NULL,
	"status" "certificate_status" DEFAULT 'NOT_EARNED' NOT NULL,
	"earned_at" timestamp,
	"issued_at" timestamp,
	"expires_at" timestamp,
	"final_score" numeric(5, 2),
	"certificate_url" text,
	"verification_code" text,
	"template_id" text,
	"custom_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_certificates_enrollment_id_unique" UNIQUE("enrollment_id"),
	CONSTRAINT "course_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"mentee_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"overall_progress" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"time_spent_minutes" integer DEFAULT 0 NOT NULL,
	"current_module_id" uuid,
	"current_section_id" uuid,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"paid_amount" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"payment_intent_id" text,
	"enrollment_notes" text,
	"is_gift" boolean DEFAULT false,
	"gift_from_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"status" "progress_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"last_watched_position_seconds" integer DEFAULT 0,
	"watch_count" integer DEFAULT 0 NOT NULL,
	"first_started_at" timestamp,
	"last_accessed_at" timestamp,
	"completed_at" timestamp,
	"student_notes" text,
	"bookmarked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"mentee_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" text,
	"review" text,
	"is_verified_purchase" boolean DEFAULT true NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"helpful_votes" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"instructor_response" text,
	"instructor_responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_wishlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"mentee_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"notify_on_discount" boolean DEFAULT true NOT NULL,
	"notify_on_update" boolean DEFAULT false NOT NULL,
	CONSTRAINT "course_wishlist_course_id_mentee_id_pk" PRIMARY KEY("course_id","mentee_id")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"transaction_id" text NOT NULL,
	"payment_provider" text DEFAULT 'stripe' NOT NULL,
	"payment_method" text,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"original_amount" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0.00',
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"status" "payment_status" NOT NULL,
	"failure_reason" text,
	"payment_intent_id" text,
	"receipt_url" text,
	"invoice_id" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
ALTER TABLE "course_analytics" ADD CONSTRAINT "course_analytics_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_analytics" ADD CONSTRAINT "course_analytics_content_item_id_section_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."section_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categories" ADD CONSTRAINT "course_categories_parent_category_id_course_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."course_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_category_relations" ADD CONSTRAINT "course_category_relations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_category_relations" ADD CONSTRAINT "course_category_relations_category_id_course_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."course_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_gift_from_user_id_users_id_fk" FOREIGN KEY ("gift_from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_content_item_id_section_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."section_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_wishlist" ADD CONSTRAINT "course_wishlist_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_wishlist" ADD CONSTRAINT "course_wishlist_mentee_id_mentees_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."mentees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE cascade ON UPDATE no action;