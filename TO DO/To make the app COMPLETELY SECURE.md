# To make the app COMPLETELY SECURE (Production Hardening Implementation Guide)

This document is a complete, unambiguous implementation plan for a new developer to harden the app. It covers:
- OTP abuse prevention (rate limiting + lockouts)
- CSRF protection for cookie-based auth
- Upload hardening (private storage + signed URLs + malware scanning)
- Webhook hardening (LiveKit)
- RLS enforcement for Supabase subscription tables

This codebase uses:
- Next.js App Router (`app/`)
- Better-Auth (`lib/auth.ts`)
- Drizzle ORM + Postgres (`lib/db`)
- Supabase (subscriptions + storage) via `lib/supabase/server.ts`
- LiveKit (webhooks, recordings)

Your goal: implement the items below exactly. Do not skip steps. Fail loudly on errors.

---

## 0) Quick map of relevant files

OTP
- `app/api/auth/send-otp/route.ts`
- `app/api/auth/verify-otp/route.ts`
- `lib/otp.ts`
- `lib/db/schema/email-verifications.ts`
- `lib/rate-limit.ts` (currently in-memory; not production-grade)

CSRF
- Many API routes under `app/api/**/route.ts` with POST/PUT/PATCH/DELETE
- Auth and session logic in `lib/auth.ts` and `lib/auth-client.ts`

Uploads
- `app/api/upload/route.ts`
- `lib/storage/index.ts`
- `lib/storage/providers/supabase.ts`

Webhooks
- `app/api/livekit/webhook/room-events/route.ts`
- `app/api/livekit/webhook/recording/route.ts`
- `lib/livekit/webhook.ts`
- `lib/db/schema/livekit.ts` (has `livekit_events.webhook_id`)

RLS / Supabase Subscriptions
- `app/api/subscriptions/*.ts`
- `lib/subscriptions/enforcement.ts`
- `lib/supabase/server.ts` (currently uses service role key)
- Subscription tables are in Supabase and described in `SUBSCRIPTION_IMPLEMENTATION_GUIDE.md`

---

## 1) OTP Abuse Prevention (Rate limiting + lockouts)

### 1.1 Required outcomes
- `send-otp` and `verify-otp` cannot be brute-forced.
- Hard limits by IP and by email.
- Repeated failures lock the email temporarily.
- Rate limiting must be distributed (not in-memory).

### 1.2 Dependencies (use Upstash Redis)
Install:
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

Env variables (`.env.local`):
```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 1.3 Add a distributed rate limiter
Create `lib/security/rate-limit.ts`:
```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Tuned limits for OTP endpoints
export const otpSendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
});

export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 per minute
});

export const otpEmailLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '10 m'), // 3 per 10 minutes per email
});

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.ip || 'unknown';
}
```

### 1.4 Add OTP lockout tracking (DB)
Update `lib/db/schema/email-verifications.ts`:
- Add columns:
  - `attempts` (integer, default 0)
  - `lockedUntil` (timestamp, nullable)
  - `lastSentAt` (timestamp, nullable)

Migration SQL (apply using your normal DB migration flow):
```sql
ALTER TABLE email_verifications
  ADD COLUMN attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN locked_until timestamptz,
  ADD COLUMN last_sent_at timestamptz;
```

### 1.5 Update `lib/otp.ts`
Required behavior:
- If `locked_until` is in the future, refuse to send a new OTP.
- Increment `attempts` on failed verify.
- Lock after 5 failed attempts for 15 minutes.
- Reset attempts to 0 on success.

Pseudo-logic (implement exactly):
```ts
// On send
if (existing.locked_until && existing.locked_until > now) {
  return { success: false, error: 'OTP temporarily locked. Try later.' };
}
// Write last_sent_at = now when sending.

// On verify failure
attempts++
if attempts >= 5 -> locked_until = now + 15 min

// On verify success
attempts = 0
locked_until = null
```

### 1.6 Update OTP routes

`app/api/auth/send-otp/route.ts`
- Before calling `sendVerificationOtp`, apply:
  - `otpSendLimiter` by IP
  - `otpEmailLimiter` by email
- If blocked: return 429 with `Retry-After` header.

`app/api/auth/verify-otp/route.ts`
- Before DB delete, apply:
  - `otpVerifyLimiter` by IP
  - `otpEmailLimiter` by email
- On invalid OTP, increment attempts and potentially lock.

### 1.7 Test cases
- 6th `send-otp` within 1 minute => 429.
- 4th send within 10 minutes to same email => 429.
- 5 invalid OTPs => locked for 15 minutes.
- Valid OTP resets attempts and unlocks.

---

## 2) CSRF Protection (cookie-based auth)

### 2.1 Required outcomes
- All state-changing requests (POST/PUT/PATCH/DELETE) require a CSRF token.
- Token must be validated server-side.
- Webhooks must be excluded.

### 2.2 Strategy: Double-submit cookie
This app uses cookie-based auth (Better-Auth). Use a CSRF cookie + header match.

### 2.3 Add CSRF utilities
Create `lib/security/csrf.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE = 'ym_csrf_token';
const CSRF_HEADER = 'x-csrf-token';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: NextResponse, token: string) {
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by client to echo header
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function validateCsrf(req: NextRequest): void {
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get(CSRF_HEADER);
  if (!cookie || !header || cookie !== header) {
    throw new Error('CSRF validation failed');
  }
}
```

### 2.4 Add CSRF token endpoint
Create `app/api/auth/csrf/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie } from '@/lib/security/csrf';

export async function GET() {
  const token = generateCsrfToken();
  const res = NextResponse.json({ token });
  setCsrfCookie(res, token);
  return res;
}
```

### 2.5 Enforce CSRF on all state-changing API routes
Add a helper in `lib/api/guards.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/security/csrf';

export function requireCsrf(request: NextRequest) {
  try {
    validateCsrf(request);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid CSRF token' }, { status: 403 });
  }
  return null;
}
```

Apply `requireCsrf` to **every** POST/PUT/PATCH/DELETE route under `app/api` except:
- `/api/livekit/webhook/*` (external service)
- `/api/auth/*` endpoints that are called without existing session cookies

Concrete implementation:
```ts
const csrfError = requireCsrf(request);
if (csrfError) return csrfError;
```

### 2.6 Client-side usage
- On app load, call `/api/auth/csrf` once and store token in memory.
- Add a fetch wrapper that injects `x-csrf-token` from cookie or stored token.

### 2.7 Test cases
- POST without `x-csrf-token` => 403.
- POST with incorrect token => 403.
- POST with valid token => 200.

---

## 3) Uploads: Private storage + signed URLs + malware scanning

### 3.1 Required outcomes
- All uploads stored privately.
- Client access via short-lived signed URLs only.
- All uploads scanned for malware before becoming accessible.

### 3.2 Make storage private
Supabase Storage:
- Create bucket `uploads-private` (private).
- Remove/avoid public URLs anywhere.

Update `lib/storage/providers/supabase.ts`:
- Always return `path` + `contentType`, **not** public URL.
- Use `createSignedUrl` when serving files.

Update `lib/storage/index.ts`:
- Use private bucket name.
- Remove `public: true` from all uploads.
- Remove fallback content types. Fail loudly on unsupported types.

### 3.3 MIME sniffing (do not trust client)
Install:
```bash
pnpm add file-type
```

Add `lib/security/file-validate.ts`:
```ts
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'video/mp4', 'video/webm',
]);

export async function assertSafeFile(buffer: ArrayBuffer): Promise<{ mime: string }>{
  const type = await fileTypeFromBuffer(Buffer.from(buffer));
  if (!type || !ALLOWED.has(type.mime)) {
    throw new Error('Unsupported or unsafe file type');
  }
  return { mime: type.mime };
}
```

In `app/api/upload/route.ts`:
- Read file into buffer.
- Call `assertSafeFile`.
- Use validated mime type in storage upload.

### 3.4 Signed URL endpoint
Create `app/api/uploads/signed-url/route.ts`:
- Require auth.
- Validate user is allowed to access the file based on DB ownership.
- Return signed URL using `storage.getSignedUrl(path, 60)` (short-lived).

Rule of thumb for access checks:
- Mentor content files: only the owning mentor, admins, or enrolled mentees.
- Resumes and profile docs: only the owner + admins.

### 3.5 Malware scanning (mandatory)
Use ClamAV as a dedicated scanning service:
- Add a `services/clamav` container or host VM.
- Expose a simple internal API: `POST /scan` that returns `{ clean: boolean }`.

Flow:
1) Upload file to `uploads-quarantine` (private).
2) Send file to scanner.
3) If clean, move to `uploads-private` and delete from quarantine.
4) If infected, delete quarantine file and return 422.

Add `lib/security/virus-scan.ts`:
```ts
export async function scanBuffer(buffer: Buffer): Promise<void> {
  const res = await fetch(process.env.CLAMAV_SCAN_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: buffer,
  });
  if (!res.ok) throw new Error('Virus scan failed');
  const json = await res.json();
  if (!json.clean) throw new Error('File rejected by malware scan');
}
```

### 3.6 Test cases
- Upload unsupported type => 400.
- Upload malware test file => 422.
- Signed URL expires after 60s.
- Public URL no longer returned.

---

## 4) Webhook Hardening (LiveKit)

### 4.1 Required outcomes
- Signature verification required.
- Reject invalid content type or oversized payloads.
- Deduplicate webhook deliveries.
- Log IP + User-Agent.

### 4.2 Signature verification (already present)
- `lib/livekit/webhook.ts` uses LiveKit SDK to verify signatures.
- Ensure env vars:
```
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### 4.3 Enforce Content-Type + body size
In both `app/api/livekit/webhook/room-events/route.ts` and `recording/route.ts`:
- Require `content-type` to include `application/webhook+json`.
- Reject if raw body > 1 MB.

### 4.4 Deduplication
Use `livekit_events.webhook_id`:
- If payload contains an `id` field, store it as `webhook_id`.
- If not, compute `sha256` of the raw body and use that as `webhook_id`.
- Add a **unique index** on `webhook_id` to prevent duplicates.

SQL:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS livekit_events_webhook_id_unique
ON livekit_events(webhook_id)
WHERE webhook_id IS NOT NULL;
```

On duplicate insert, return 200 (idempotent) without reprocessing.

### 4.5 IP allowlist (optional but recommended)
- Add env `LIVEKIT_WEBHOOK_IPS` as CSV.
- Compare `x-forwarded-for` against allowlist; reject others.

---

## 5) RLS Hardening for Subscription Tables (Supabase)

### 5.1 Required outcomes
- Row-level security is enforced for user-facing reads/writes.
- Admins can manage all subscriptions.
- Public can view only active plans.
- Service role is used only for admin/system tasks.

### 5.2 Create explicit RLS helper functions (SQL)
In Supabase SQL editor, add (or verify) the following functions:
```sql
CREATE OR REPLACE FUNCTION is_admin(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = user_id AND r.name = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION has_subscription_access(user_id text, subscription_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT user_id = subscription_user_id OR is_admin(user_id);
$$;
```

### 5.3 Enforce RLS policies on subscription tables
Enable RLS and policies for:
- `subscription_plans`
- `subscription_plan_features`
- `subscription_plan_prices`
- `subscription_features`
- `subscriptions`
- `subscription_usage_tracking`
- `subscription_usage_events`

Example policies (apply per table):
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
ON subscriptions FOR SELECT
USING (has_subscription_access(current_setting('app.current_user_id', true), user_id));

CREATE POLICY "subscriptions_admin_all"
ON subscriptions FOR ALL
USING (is_admin(current_setting('app.current_user_id', true)));
```

Public read for active plans:
```sql
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_plans"
ON subscription_plans FOR SELECT
USING (status = 'active');
```

### 5.4 Use a non-bypass DB role for user endpoints
Service role bypasses RLS. For RLS to matter, user endpoints must connect with a role that does NOT have bypassrls.

Create a restricted DB role:
```sql
CREATE ROLE app_rls LOGIN PASSWORD 'STRONG_PASSWORD' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_rls;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
```

Add env:
```
SUPABASE_RLS_DB_URL=postgres://app_rls:STRONG_PASSWORD@<host>:5432/<db>
```

Create `lib/supabase/rls-client.ts` (pg or drizzle) that uses `SUPABASE_RLS_DB_URL` and ALWAYS sets:
```sql
SELECT set_config('app.current_user_id', '<userId>', true);
```

Then update user-facing subscription endpoints (`/api/subscriptions/*`) to use `rls-client` instead of `service_role`.
Keep service role for admin endpoints only.

### 5.5 Verification
- User can only read own subscriptions.
- Admin can read all.
- Public can read only active plans.
- Attempts to read other users' data are denied by RLS.

---

## 6) Final checklist

OTP
- [ ] Upstash rate limit in place for send/verify
- [ ] Lockout after repeated failures
- [ ] No in-memory rate limiting

CSRF
- [ ] CSRF token endpoint
- [ ] CSRF enforced for all state-changing routes
- [ ] Webhooks excluded

Uploads
- [ ] Private bucket only
- [ ] Signed URLs only
- [ ] Malware scanning implemented
- [ ] MIME sniffing enforced

Webhooks
- [ ] Signature verification
- [ ] Content-Type and size checks
- [ ] Deduplication
- [ ] IP/User-Agent logging

RLS
- [ ] RLS enabled on subscription tables
- [ ] Policies verified
- [ ] Non-bypass role used for user endpoints

---

## 7) Where to ask questions
If anything is unclear, resolve it before coding. Do not ship partial security.
