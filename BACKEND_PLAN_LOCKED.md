# Backend production readiness + add-ons plan (locked)

This file is a copy of the Cursor plan, saved into the repo root for easy reference.

> Source plan: `backend-production-addons` (Cursor plan file)

## Verified repo findings (why the TODOs are valid)

## Data isolation status (current repo)

### What you already have (strong foundation)
- **Postgres Row Level Security (RLS) policies exist** in [`prisma/init.sql`](prisma/init.sql):
  - Tenant tables enforce `adminId == current_setting('app.current_admin_id')`
  - Super-admin bypass requires `current_setting('app.is_super_admin') = 'true'`
  - `FORCE ROW LEVEL SECURITY` is enabled (so even privileged roles must satisfy policies)
- **Many admin APIs already use** `withAdminContext(adminId, fn)` from [`lib/db.ts`](lib/db.ts), which sets `app.current_admin_id` for the transaction. Example: [`app/api/admin/sales/route.ts`](app/api/admin/sales/route.ts).
- **Sub-admin authorization model exists** (`lib/permissions.ts`) and several routes apply `requirePermission()` plus shop scoping via `getActorFromPayload()` and `actor.shopId`.

### What is missing / risky today (must fix in Phase 0)
- **Not all routes consistently set RLS context**:
  - Some routes query Prisma directly with `where: { adminId: ... }` (works, but relies on developer discipline and doesn’t leverage RLS safety net).
  - Some super-admin routes query Prisma **without** `withSuperAdminContext()` (and with `FORCE RLS`, those queries may fail in a deployment that actually runs `init.sql`).
- **JWT payload inconsistency breaks isolation indirectly**:
  - Example: [`app/api/admin/ai/check-access/route.ts`](app/api/admin/ai/check-access/route.ts) uses `getAdminFromRequest()` and then reads `payload.id`, but admin login issues tokens with `adminId`. That can cause wrong/missing `adminId` and therefore wrong scoping.

### Current answer to your questions
- **Admin data isolation**: *Partially yes.* You have RLS + many routes use `withAdminContext`, and many queries also filter `adminId`. But it is **not uniformly enforced** across all APIs yet.
- **Admin can access only their sub-admins**: *Yes in the main admin routes shown*, e.g. `sub-admins` listing/creation uses `where: { adminId }` and checks shop belongs to admin. Still, it must be standardized and tested.
- **Sub-admin isolation**: *Mostly yes.* Tokens include `{ adminId, subAdminId, shopId }` and routes that support subadmins commonly enforce `shopId` restrictions. Needs systematic coverage across all write endpoints.

### Auth/JWT is inconsistent today (real risk)
- Repo currently has **two JWT implementations**:
  - [`lib/auth.ts`](lib/auth.ts) uses `jose` directly and signs admin tokens with `{ id, email, shopName, verificationStatus, role }`.
  - [`lib/jwt.ts`](lib/jwt.ts) exposes `jwtSign/jwtVerify` and routes like [`app/api/auth/admin/login/route.ts`](app/api/auth/admin/login/route.ts) sign payloads with `{ adminId, role, shopId, verificationStatus, isActive, planId }`.

### Rate limiting is in-memory today (won’t work in production)
- `middleware.ts` and login routes implement rate limiting via `Map` in memory.

### Security headers/CORS code exists but isn’t enforced
- [`lib/security.ts`](lib/security.ts) defines security headers/CORS allowlist/helmet config + express-rate-limit configs, but it isn’t applied consistently.

### Uploads contain PII and have two different implementations
- Two upload routes with different validation:
  - [`app/api/upload/documents/route.ts`](app/api/upload/documents/route.ts) validates by `File.type` and stores locally.
  - [`app/api/admin/upload/documents/route.ts`](app/api/admin/upload/documents/route.ts) uses `validateDocumentFile` (magic bytes) and optionally Cloudinary.
- Middleware matcher excludes `uploads`, which can lead to **public access** if the hosting layer serves it.

## Scope
- Backend only: Prisma schema, API routes under `app/api/**`, middleware, auth, security, billing/add-ons enforcement.
- Frontend redesign explicitly deferred.

## Design decisions (locked)
- **Pricing model**: Option A Base + Add-ons.
- **Tier-2/3 friendly pricing** (constants in code + DB priceAtPurchase snapshot):
  - Base Lite ₹149/mo, Base Standard ₹249/mo
  - Add-ons: Inventory ₹49, Sales ₹49, Repair ₹79, Recharge ₹29, Money Transfer ₹49, Advanced Reports ₹49, Advanced Audit ₹29, Extra shop ₹39/shop, Extra seat ₹19/seat or 5-pack ₹79
  - AI packs: Basic ₹99, Standard ₹199, Pro ₹299
  - Top-ups: OCR ₹49/300, Strategy ₹49/100
- **AI usage is quota-capped** per admin per day; top-ups only.

## Phases

### Phase 0 (P0): Security + env + auth unification
- Remove all dev secret fallbacks and enforce startup env validation.
- Create a single JWT signing/verifying module and a single payload schema.
- Centralize auth extraction + role checks for admin/subadmin/superadmin.
- Replace in-memory brute force protection with Redis-backed rate limiting.
- Apply security headers globally and enforce CORS allowlist where required.
- **Tenant isolation enforcement**:
  - Ensure **every** `/api/admin/**` DB access sets `app.current_admin_id` (prefer `withAdminContext`).
  - Ensure **every** `/api/super-admin/**` DB access sets `app.is_super_admin` (use `withSuperAdminContext`).
  - Ensure production deployments actually run `prisma/init.sql` policies (docker init or migration).

### Phase 1 (P1): Module catalog + entitlements + strict gating
- Add tables: `Module`, `AdminModule`, `Entitlement` (and minimal `Invoice`/`Payment` if needed).
- Implement central guards:
  - `assertModuleEnabled(adminId, moduleKey)`
  - `assertEntitlement(adminId, key, required)`
- Apply guards to every relevant `/api/admin/**` route.

### Phase 2 (P1): Customer indexing + return-customer workflows
- Add `Customer` model with E.164 normalization and indexes.
- Add `customerId` to `Sale`, `Repair`, `RechargeTransfer`.
- Add `findOrCreateCustomer` service.
- Add APIs: customer search by phone, customer summary.

### Phase 3 (P2): AI extraction pipeline with quotas/top-ups
- Add AI quota accounting (daily limits by plan/add-ons + top-ups).
- Add extract endpoints with store-and-confirm flow.
- Ensure “no direct DB write from AI” without confirm.

### Phase 4 (P2): Reliability gates
- Unit tests for env/auth/gating/quota/customer indexing.
- Integration tests for auth + module locks.
- CI workflow running lint/typecheck/build/prisma validate/tests.
- Add `/api/health` and `/api/ready`.

## Claude Code prompts (copy/paste)

### Prompt — Phase 0 (Security/Auth)
You are implementing backend-only production hardening for a Next.js App Router + Prisma + Postgres app.

Goals:
- Remove insecure dev secret fallbacks. If required env vars are missing, the server should fail early.
- Add Zod-based env validation (server-only) for DATABASE_URL, JWT_SECRET, SUPER_ADMIN_JWT_SECRET, NODE_ENV, ALLOWED_ORIGINS, SA_ROUTE_SLUG, SA_ALLOWED_IPS, upload limits, optional Cloudinary vars.
- Unify JWT signing/verifying into ONE module and ONE payload schema. Standard payload must support admin and subadmin and superadmin.
- Replace in-memory rate limiting in middleware/login routes with Redis-backed limiter (Upstash Redis or self-hosted Redis via connection string).
- Ensure no route trusts headers for auth; every /api/admin route must verify cookie/JWT.
- Apply security headers globally; enforce CORS allowlist for API routes where applicable.
- Enforce tenant isolation end-to-end:
  - Ensure Postgres RLS is actually enabled in your production DB (apply `prisma/init.sql` or migrate-equivalent).
  - Ensure every `/api/admin/**` route runs DB queries inside `withAdminContext(adminId, ...)` so `app.current_admin_id` is set.
  - Ensure every `/api/super-admin/**` route runs DB queries inside `withSuperAdminContext(...)` so `app.is_super_admin=true` is set.

### Prompt — Phase 1 (Modules/Add-ons + gating)
Implement Base plan + Add-ons backend architecture.

Goals:
- Add Prisma models for Module catalog, AdminModule purchases, Entitlements (limits and quotas), and minimal Invoice/Payment record.
- Seed initial module catalog keys: INVENTORY, SALES, REPAIR, RECHARGE, MONEY_TRANSFER, REPORTS_ADVANCED, AUDIT_ADVANCED, MULTI_SHOP, EXTRA_SEATS, AI_OCR_EXTRACT.
- Implement runtime enforcement helpers assertModuleEnabled and assertEntitlement.
- Update /api/admin routes to require the right modules.
- Ensure downgrade behavior: data remains but write actions are blocked if module disabled.
- When a module is disabled, return a stable error shape that frontend can render as “Upgrade to unlock”.

### Prompt — Phase 2 (Customer indexing + return search)
Implement customer master and indexing (backend-only).

Goals:
- Add `Customer` model:
  - fields: `id`, `adminId`, `phoneE164`, `name?`, `notes?`, `createdAt`
  - constraints: `@@unique([adminId, phoneE164])`, `@@index([adminId, phoneE164])`
- Add `customerId` foreign key columns to:
  - `Sale`, `Repair`, `RechargeTransfer` (future: MoneyTransfer)
- Implement phone normalization utility:
  - Accept inputs like `98xxxxxxx`, `+9198xxxxxxx`, `098...`
  - Output canonical E.164 (India default +91) and reject invalid lengths.
- Add service helper: `findOrCreateCustomer(adminId, phoneE164, optionalName)`
- Add endpoints:
  - `GET /api/admin/customers/search?phone=` (exact + partial)
  - `GET /api/admin/customers/[customerId]/summary` (last N Sales/Repairs/Recharges)
- Update existing create flows (Sale/Repair/Recharge):
  - Allow providing `customerPhone` and auto-resolve/store `customerId`
  - Ensure scoping: all queries must use `withAdminContext(adminId, ...)` and shop scoping for subadmins.

Deliverables:
- Prisma schema + migration(s)
- New service module (e.g. `lib/services/customer.ts`)
- Updated route handlers + validation schemas
- Tests for uniqueness + lookup performance

### Prompt — Phase 3 (AI extraction quota pipeline)
Implement AI extraction pipeline with strict safety (backend-only).

Goals:
- Enforce access via add-ons:
  - AI endpoints must require one of: `AI_PACK_BASIC|AI_PACK_STANDARD|AI_PACK_PRO`
- Implement quota ledger (no in-memory counters):
  - Track per-admin per-day usage by category:
    - OCR_EXTRACT
    - FESTIVAL_OFFERS
    - SLOW_STOCK
    - MONTHLY_STRATEGY
    - LANGUAGE_ASSIST
  - Quotas come from entitlements based on AI pack + top-up credits.
- Implement top-ups:
  - OCR top-up: +300 extractions per purchase
  - Strategy top-up: +100 requests per purchase
  - Persist `creditsPurchased`, `creditsUsed`, and consumption records.
- Implement safe workflow (confirm-before-write):
  - `POST /api/admin/ai/extract/repair`:
    - accept an image upload
    - run OCR/vision
    - return structured JSON + confidence per field
    - store extraction result with TTL and adminId binding
  - `POST /api/admin/ai/confirm/repair`:
    - requires extractedId + user-confirmed fields
    - writes final Repair record under `withAdminContext(adminId, ...)`
- Privacy:
  - Do not log PII or full extracted text
  - Store images privately; auto-delete after TTL if not confirmed.

Deliverables:
- Quota/credit models + migrations
- `lib/services/aiQuota.ts` (or similar) with `assertQuotaAvailable()` + `consumeQuota()`
- Extraction storage table + TTL cleanup approach
- Updated AI routes to use quota + entitlement enforcement
- Tests for quota reset, top-up consumption, and confirm flow

### Prompt — Phase 4 (Tests/CI/Health)
Add reliability gates (backend-only).

Goals:
- Add unit tests:
  - env validation
  - JWT payload schema and backward-compatibility behavior
  - module gating and entitlement calculation
  - quota enforcement + top-up consumption
  - customer find-or-create and unique constraints
- Add integration tests for `/api/admin/*`:
  - unauthorized requests return 401
  - module disabled returns 403 with stable error code (MODULE_DISABLED)
  - quota exceeded returns stable error code (QUOTA_EXCEEDED)
- Add CI workflow (GitHub Actions):
  - `npm ci`, lint, typecheck, build, prisma validate, tests
- Add endpoints:
  - `/api/health` (liveness)
  - `/api/ready` (DB connectivity, basic checks)
- Observability baseline:
  - requestId + latency + actorId structured logs
  - integrate Sentry later if desired (but keep hooks ready).

Deliverables:
- Test setup + test suites
- `.github/workflows/ci.yml`
- health + readiness endpoints

