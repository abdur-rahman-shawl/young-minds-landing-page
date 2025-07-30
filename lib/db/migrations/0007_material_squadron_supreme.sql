CREATE TYPE "public"."content_item_type" AS ENUM('VIDEO', 'PDF', 'DOCUMENT', 'URL', 'TEXT');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('COURSE', 'FILE', 'URL');--> statement-breakpoint
CREATE TYPE "public"."course_difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED');--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"difficulty" "course_difficulty" NOT NULL,
	"duration_minutes" integer,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"thumbnail_url" text,
	"category" text,
	"tags" text,
	"prerequisites" text,
	"learning_outcomes" text,
	"enrollment_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courses_content_id_unique" UNIQUE("content_id")
);
--> statement-breakpoint
CREATE TABLE "mentor_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "content_type" NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"url" text,
	"url_title" text,
	"url_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "content_item_type" NOT NULL,
	"order_index" integer NOT NULL,
	"content" text,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"duration_seconds" integer,
	"is_preview" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_content_id_mentor_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."mentor_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_content" ADD CONSTRAINT "mentor_content_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_content_items" ADD CONSTRAINT "section_content_items_section_id_course_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE cascade ON UPDATE no action;