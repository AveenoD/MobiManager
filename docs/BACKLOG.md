# Backlog

Out-of-scope items noted during S0 execution. Each item links to relevant code for future reference.

---

## Items discovered during S0

| Item | Location | Notes |
|------|----------|-------|
| Pre-existing test failure in `test/env.test.ts` | `test/env.test.ts:22` | Test expects `process.exit(1)` to throw but code throws plain Error instead. Not related to S0 changes — existing test design issue. |
| UUID vs TEXT inconsistency | `prisma/schema.prisma` + DB | Prisma schema uses `@id @default(uuid())` but actual DB has TEXT columns. Schema needs `@db.Text` annotations or DB needs migration to UUID. Resolved at DB level for now; schema not yet aligned. |
| Missing Module/AdminModule/Entitlement tables in DB | `prisma/schema.prisma` | Schema defines Module, AdminModule, Entitlement, Invoice, Payment but these tables don't exist in DB. Should be created by future migrations or `prisma migrate dev`. S1+ will address. |
| `env.ts` changed before S0 | `lib/env.ts` | Redis URL validation was already changed from `z.string().url().optional()` to allow empty string. Not part of S0 changes. |

---

## S0 post-execution observations

- The migration `20260428_add_customers` uses TEXT UUIDs because the init migration created TEXT columns. Future migrations (S2+) should continue using TEXT to match existing schema.
- `npx prisma migrate reset` fails when migrations reference tables/columns that don't exist. We had to manually apply migrations and manually insert `_prisma_migrations` records.
- RLS FORCE ROW LEVEL SECURITY was not set on Customer, AIConsumption, AITopUp, AIExtraction by init.sql. Applied manually.