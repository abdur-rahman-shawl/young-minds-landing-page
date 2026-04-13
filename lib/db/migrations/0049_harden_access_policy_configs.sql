CREATE INDEX IF NOT EXISTS "access_policy_configs_created_by_idx"
  ON "access_policy_configs" ("created_by");

CREATE INDEX IF NOT EXISTS "access_policy_configs_published_by_idx"
  ON "access_policy_configs" ("published_by");

ALTER TABLE "access_policy_configs" ENABLE ROW LEVEL SECURITY;
