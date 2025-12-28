CREATE TABLE "email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "occurred_at" timestamp DEFAULT now() NOT NULL,
  "action" text NOT NULL,
  "to" text NOT NULL,
  "subject" text,
  "template" text,
  "actor_type" text,
  "actor_id" text,
  "details" jsonb
);

CREATE INDEX "email_events_action_occurred_idx" ON "email_events" ("action","occurred_at");
CREATE INDEX "email_events_recipient_occurred_idx" ON "email_events" ("to","occurred_at");
