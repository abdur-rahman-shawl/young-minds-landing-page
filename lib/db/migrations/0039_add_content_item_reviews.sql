CREATE TABLE "content_item_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid NOT NULL REFERENCES "public"."courses"("id") ON DELETE cascade,
  "content_item_id" uuid NOT NULL REFERENCES "public"."section_content_items"("id") ON DELETE cascade,
  "mentee_id" uuid NOT NULL REFERENCES "public"."mentees"("id") ON DELETE cascade,
  "enrollment_id" uuid NOT NULL REFERENCES "public"."course_enrollments"("id") ON DELETE cascade,
  "rating" integer NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "title" text,
  "review" text,
  "is_verified_purchase" boolean NOT NULL DEFAULT true,
  "is_published" boolean NOT NULL DEFAULT true,
  "helpful_votes" integer NOT NULL DEFAULT 0,
  "report_count" integer NOT NULL DEFAULT 0,
  "instructor_response" text,
  "instructor_responded_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "content_item_reviews_content_item_id_idx" ON "content_item_reviews" ("content_item_id");
CREATE INDEX "content_item_reviews_course_id_idx" ON "content_item_reviews" ("course_id");
CREATE INDEX "content_item_reviews_mentee_id_idx" ON "content_item_reviews" ("mentee_id");
CREATE INDEX "content_item_reviews_created_at_idx" ON "content_item_reviews" ("created_at");
