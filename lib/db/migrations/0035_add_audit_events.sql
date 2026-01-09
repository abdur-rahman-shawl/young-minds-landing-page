CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "occurred_at" timestamp DEFAULT now() NOT NULL,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "actor_role" text,
  "action" text NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text,
  "status" text,
  "request_id" text,
  "trace_id" text,
  "ip_address" text,
  "user_agent" text,
  "details" jsonb,
  "diff" jsonb,
  "schema_version" integer DEFAULT 1 NOT NULL
);

CREATE INDEX "audit_events_resource_occurred_idx" ON "audit_events" ("resource_type","resource_id","occurred_at");
CREATE INDEX "audit_events_actor_occurred_idx" ON "audit_events" ("actor_id","occurred_at");
CREATE INDEX "audit_events_action_occurred_idx" ON "audit_events" ("action","occurred_at");
