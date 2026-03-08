ALTER TABLE "subscription_usage_events"
ADD COLUMN IF NOT EXISTS "idempotency_key" text;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_usage_events_idempotency_key_uidx"
ON "subscription_usage_events" ("idempotency_key")
WHERE "idempotency_key" IS NOT NULL;
