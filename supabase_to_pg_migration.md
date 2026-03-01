# Supabase to Plain PostgreSQL Migration

## Goal
- Remove Supabase as the application database query layer.
- Keep compatibility with both Supabase-hosted Postgres and plain Postgres through `DATABASE_URL`.
- Preserve Supabase Storage for now.

## Current Status
- Subscription tables and runtime routes were previously coupled to Supabase PostgREST.
- Local Postgres bootstrap is now standardized via `compose.yaml`.
- Subscription schema is now checked into `lib/db/schema/subscriptions.ts`.
- Subscription DDL is now checked into `lib/db/migrations/0044_create_subscription_tables.sql`.

## Local Postgres Workflow
1. Start Postgres:
   - `docker compose up -d postgres`
2. Point app/database tooling at local Postgres:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/young_minds`
3. Apply schema:
   - `pnpm db:migrate`
4. Seed data if needed:
   - `pnpm db:seed`
5. Run the app:
   - `pnpm dev`

## Phases

### Phase 0: Inventory and Audit
- Inventory every `@/lib/supabase/server` import.
- Inventory every `@supabase/supabase-js` database usage.
- Define the migration acceptance rule:
  - runtime DB paths must work with only `DATABASE_URL`
  - Supabase variables remain storage-only

### Phase 1: Local Plain Postgres
- Use `compose.yaml` as the team-standard local DB.
- Use `.env.example` as the baseline local configuration.
- Validate `drizzle.config.ts`, migrations, and runtime connectivity against local Postgres.

### Phase 2: Schema Formalization
- Keep subscription schema in source control via `lib/db/schema/subscriptions.ts`.
- Keep subscription DDL in source control via `lib/db/migrations/0044_create_subscription_tables.sql`.
- Remove dependence on out-of-band Supabase-only schema setup.

### Phase 3: Shared Query Layer
- Centralize subscription DB access in `lib/db/queries/subscriptions.ts`.
- Use direct SQL/Drizzle instead of Supabase PostgREST.
- Preserve existing API response shapes.

### Phase 4: Runtime Route Migration
- Migrate subscription admin/public/member routes to the shared query layer.
- Migrate `lib/subscriptions/enforcement.ts`.
- Migrate `app/api/public-mentors/route.ts` eligibility lookups.

### Phase 5: Script Migration
- Remove Supabase RPC usage from `scripts/apply-availability-migration.ts`.
- Use direct Postgres execution through `db.execute`.
- Keep authorization in the app layer; RLS parity is not part of this phase.

### Phase 6: Validation
- Run lint/build.
- Validate routes against local Postgres.
- Validate the same code against Supabase-hosted Postgres using `DATABASE_URL`.

### Phase 7: Cloud Planning
- Only after local validation is complete:
  - evaluate on-prem Postgres, Cloud SQL, and Azure Database for PostgreSQL
  - define network, backup, TLS, pooling, and cutover strategy

## Audit Commands
- `rg "@/lib/supabase/server" app lib`
- `rg "@supabase/supabase-js" app lib scripts`
- `rg "supabase\\.rpc\\('exec_sql'" scripts`
- `rg "auth\\.uid\\(" scripts lib/db/migrations`

## Done Criteria
- All DB runtime paths use direct Postgres access.
- Local DB can be reproduced from the repository alone.
- Supabase-hosted Postgres still works through `DATABASE_URL`.
- Remaining Supabase usage is storage-only.
