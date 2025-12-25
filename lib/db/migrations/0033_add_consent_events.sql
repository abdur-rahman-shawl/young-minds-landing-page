CREATE TYPE "public"."consent_action" AS ENUM('granted', 'denied', 'revoked');
CREATE TYPE "public"."consent_source" AS ENUM('ui', 'oauth', 'browser_prompt', 'system');

CREATE TABLE "consent_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text REFERENCES "public"."users"("id") ON DELETE set null,
  "consent_type" text NOT NULL,
  "consent_version" text,
  "action" "consent_action" NOT NULL,
  "source" "consent_source" NOT NULL,
  "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "consent_events_user_type_created_idx" ON "consent_events" ("user_id","consent_type","created_at");
CREATE INDEX "consent_events_type_created_idx" ON "consent_events" ("consent_type","created_at");
