CREATE TABLE "course_review_helpful_votes" (
  "review_id" uuid NOT NULL REFERENCES "public"."course_reviews"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("review_id", "user_id")
);

CREATE INDEX "course_review_helpful_votes_review_id_idx" ON "course_review_helpful_votes" ("review_id");
CREATE INDEX "course_review_helpful_votes_user_id_idx" ON "course_review_helpful_votes" ("user_id");
