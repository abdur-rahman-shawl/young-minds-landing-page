CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "admin_session_audit_trail" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" text,
  "session_id" uuid,
  "action" text NOT NULL,
  "previous_status" text,
  "new_status" text,
  "reason" text,
  "details" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_session_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL,
  "admin_id" text,
  "note" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_session_audit_trail" ADD CONSTRAINT "admin_session_audit_trail_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_session_audit_trail" ADD CONSTRAINT "admin_session_audit_trail_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_session_notes" ADD CONSTRAINT "admin_session_notes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_session_notes" ADD CONSTRAINT "admin_session_notes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_session_audit_session_id"
ON "admin_session_audit_trail" ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_session_audit_admin_id"
ON "admin_session_audit_trail" ("admin_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_session_audit_action"
ON "admin_session_audit_trail" ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_session_audit_created_at"
ON "admin_session_audit_trail" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_session_notes_session_id"
ON "admin_session_notes" ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_admin_session_notes_admin_id"
ON "admin_session_notes" ("admin_id");
