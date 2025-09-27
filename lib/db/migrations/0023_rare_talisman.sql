CREATE TYPE "public"."reviewer_role" AS ENUM('mentor', 'mentee');--> statement-breakpoint
CREATE TABLE "review_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_text" text NOT NULL,
	"role" "reviewer_role" NOT NULL,
	"weight" numeric(4, 2) NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"rating" integer NOT NULL
);
--> statement-breakpoint

ALTER TABLE "reviews" ALTER COLUMN "reviewer_role" SET DATA TYPE "public"."reviewer_role" USING "reviewer_role"::"public"."reviewer_role";--> statement-breakpoint

ALTER TABLE "reviews" ADD COLUMN "final_score" numeric(3, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_question_id_review_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."review_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_reviewer_idx" ON "reviews" USING btree ("session_id","reviewer_id");--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "comment";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "communication_rating";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "knowledge_rating";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "helpfulness_rating";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "professionalism_rating";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "response";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "responded_at";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "is_public";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "updated_at";


-- Ensure the uuid-ossp extension is enabled to use gen_random_uuid()
-- Supabase has this enabled by default.
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Delete existing questions to prevent duplicates if script is run multiple times
-- TRUNCATE TABLE review_questions RESTART IDENTITY;

--
-- Questions for Mentees to Rate Mentors (role = 'mentor')
--
INSERT INTO review_questions (id, question_text, role, weight, display_order, is_active) VALUES
(gen_random_uuid(), 'How knowledgeable and experienced was the mentor in the subject/area you needed guidance on?', 'mentor', 0.25, 1, 'true'),
(gen_random_uuid(), 'How clearly did the mentor explain concepts, advice, or solutions?', 'mentor', 0.15, 2, 'true'),
(gen_random_uuid(), 'How approachable, patient, and supportive was the mentor during the session(s)?', 'mentor', 0.10, 3, 'true'),
(gen_random_uuid(), 'How useful and applicable was the guidance/advice you received?', 'mentor', 0.15, 4, 'true'),
(gen_random_uuid(), 'How satisfied are you with the mentorship session(s) overall?', 'mentor', 0.15, 5, 'true'),
(gen_random_uuid(), 'How would you rate the quality of the video call session (ease of interaction, audio/video clarity)?', 'mentor', 0.10, 6, 'true'),
(gen_random_uuid(), 'How well did this mentor match your needs and expectations?', 'mentor', 0.10, 7, 'true');

--
-- Questions for Mentors to Rate Mentees (role = 'mentee')
--
INSERT INTO review_questions (id, question_text, role, weight, display_order, is_active) VALUES
(gen_random_uuid(), 'How clearly did the mentee express their goals, challenges, or questions?', 'mentee', 0.20, 1, 'true'),
(gen_random_uuid(), 'How engaged and prepared was the mentee during the session?', 'mentee', 0.20, 2, 'true'),
(gen_random_uuid(), 'How receptive was the mentee to suggestions, advice, and constructive feedback?', 'mentee', 0.20, 3, 'true'),
(gen_random_uuid(), 'How likely does it seem that the mentee will act on the guidance provided?', 'mentee', 0.25, 4, 'true'),
(gen_random_uuid(), 'How well did the mentee’s needs align with your expertise?', 'mentee', 0.15, 5, 'true');
