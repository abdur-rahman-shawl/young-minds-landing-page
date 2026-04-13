DO $$
BEGIN
  CREATE TYPE "access_policy_config_status" AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "access_policy_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version" integer NOT NULL,
  "status" "access_policy_config_status" NOT NULL DEFAULT 'draft',
  "schema_version" integer NOT NULL DEFAULT 1,
  "notes" text,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by" text,
  "published_by" text,
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE "access_policy_configs"
    ADD CONSTRAINT "access_policy_configs_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "access_policy_configs"
    ADD CONSTRAINT "access_policy_configs_published_by_users_id_fk"
    FOREIGN KEY ("published_by") REFERENCES "public"."users"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "access_policy_configs_version_uidx"
  ON "access_policy_configs" ("version");

CREATE INDEX IF NOT EXISTS "access_policy_configs_status_idx"
  ON "access_policy_configs" ("status");

CREATE INDEX IF NOT EXISTS "access_policy_configs_published_at_idx"
  ON "access_policy_configs" ("published_at");

CREATE INDEX IF NOT EXISTS "access_policy_configs_created_by_idx"
  ON "access_policy_configs" ("created_by");

CREATE INDEX IF NOT EXISTS "access_policy_configs_published_by_idx"
  ON "access_policy_configs" ("published_by");

CREATE UNIQUE INDEX IF NOT EXISTS "access_policy_configs_single_draft_uidx"
  ON "access_policy_configs" ("status")
  WHERE "status" = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS "access_policy_configs_single_published_uidx"
  ON "access_policy_configs" ("status")
  WHERE "status" = 'published';

ALTER TABLE "access_policy_configs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_policy_configs_no_client_access"
  ON "access_policy_configs";

CREATE POLICY "access_policy_configs_no_client_access"
  ON "access_policy_configs"
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
