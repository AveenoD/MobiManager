/**
 * S10 C1 — RLS present on Party table ("Customer") and dictionary tables.
 * Enable: S10_RLS_METADATA=1 DATABASE_URL=... npm run test:int
 *
 * Note: Postgres superusers bypass RLS; this suite only asserts catalog state after migrations/init.sql.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const RUN = process.env.S10_RLS_METADATA === '1' && Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('S10 C1 RLS metadata (Customer + dict tables)', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const expectRlsAndPolicies = async (table: string, minPolicies: number) => {
    const rows = await prisma.$queryRaw<
      { relrowsecurity: boolean; policy_count: bigint }[]
    >`
      SELECT c.relrowsecurity AS relrowsecurity, COUNT(p.oid)::bigint AS policy_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public' AND c.relname = ${table} AND c.relkind = 'r'
      GROUP BY c.relrowsecurity, c.oid
    `;
    expect(rows.length).toBe(1);
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(Number(rows[0]?.policy_count)).toBeGreaterThanOrEqual(minPolicies);
  };

  it('Customer has FORCE RLS and tenant + superadmin policies', async () => {
    await expectRlsAndPolicies('Customer', 2);
  });

  it.each(['BrandDict', 'ModelDict', 'CategoryDict', 'IssueDict', 'OperatorDict'] as const)(
    '%s has FORCE RLS and policies',
    async (t) => {
      await expectRlsAndPolicies(t, 2);
    }
  );
});
