ALTER TABLE "sessions" DROP CONSTRAINT "sessions_rescheduled_from_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_rescheduled_from_sessions_id_fk" FOREIGN KEY ("rescheduled_from") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "mentor_rating";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "mentee_rating";