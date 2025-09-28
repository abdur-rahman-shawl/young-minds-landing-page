ALTER TABLE "sessions" DROP CONSTRAINT "sessions_rescheduled_from_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "mentor_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "mentee_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_reviewed_by_mentor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_reviewed_by_mentee" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_from_sessions_id_fk" FOREIGN KEY ("rescheduled_from") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;